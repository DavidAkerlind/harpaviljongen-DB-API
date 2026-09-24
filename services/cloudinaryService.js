import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

// Load .env here too, so this works no matter which module is imported first
dotenv.config();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use e.g. CLOUDINARY_FOLDER=menu-pdfs-dev locally so test uploads never mix with production
const PDF_FOLDER = process.env.CLOUDINARY_FOLDER || 'menu-pdfs';
const MAX_PDF_MB = 10;

const storage = multer.memoryStorage();

const multerPdf = multer({
	storage,
	limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype === 'application/pdf') {
			cb(null, true);
		} else {
			cb(
				Object.assign(new Error('Only PDF files are allowed'), {
					status: 400,
				}),
				false
			);
		}
	},
}).single('file');

// Wraps multer so a too large or wrong file gives a clear 4xx instead of a 500
const uploadPdfMiddleware = (req, res, next) => {
	multerPdf(req, res, (error) => {
		if (!error) return next();
		if (error.code === 'LIMIT_FILE_SIZE') {
			return next({
				status: 413,
				message: `The PDF is too large (max ${MAX_PDF_MB} MB)`,
			});
		}
		if (error instanceof multer.MulterError) {
			return next({ status: 400, message: error.message });
		}
		next(error);
	});
};

// The browser decides the mimetype, so also check that the file starts like a PDF
const isPdfBuffer = (buffer) =>
	Boolean(buffer) &&
	buffer.subarray(0, 1024).toString('latin1').includes('%PDF-');

const uploadToCloudinary = (buffer, filename) => {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				resource_type: 'image',
				folder: PDF_FOLDER,
				public_id: filename,
				format: 'pdf',
			},
			(error, result) => {
				if (error) reject(error);
				else resolve(result);
			}
		);
		stream.end(buffer);
	});
};

// PDFs are uploaded as 'image'. Older uploads may be 'raw', so try that too when unknown.
const deleteFromCloudinary = async (publicId, resourceType) => {
	const types = resourceType ? [resourceType] : ['image', 'raw'];
	for (const type of types) {
		const result = await cloudinary.uploader.destroy(publicId, {
			resource_type: type,
			invalidate: true,
		});
		if (result?.result === 'ok') return result;
	}
	return { result: 'not found' };
};

export {
	cloudinary,
	uploadPdfMiddleware,
	uploadToCloudinary,
	deleteFromCloudinary,
	isPdfBuffer,
};
