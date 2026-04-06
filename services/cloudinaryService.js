import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const uploadPdfMiddleware = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
	fileFilter: (req, file, cb) => {
		if (file.mimetype === 'application/pdf') {
			cb(null, true);
		} else {
			cb(new Error('Only PDF files are allowed'), false);
		}
	},
}).single('file');

const uploadToCloudinary = (buffer, filename) => {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				resource_type: 'image',
				folder: 'menu-pdfs',
				public_id: filename,
				format: 'pdf',
			},
			(error, result) => {
				if (error) reject(error);
				else resolve(result);
			},
		);
		stream.end(buffer);
	});
};

export { cloudinary, uploadPdfMiddleware, uploadToCloudinary };
