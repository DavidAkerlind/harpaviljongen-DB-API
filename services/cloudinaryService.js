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
// Profile pictures. Use admin-avatars-dev locally.
const AVATAR_FOLDER = process.env.CLOUDINARY_AVATAR_FOLDER || 'admin-avatars';
const MAX_IMAGE_MB = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

const multerImage = multer({
	storage,
	limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (IMAGE_TYPES.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				Object.assign(new Error('Only JPG, PNG or WebP images are allowed'), {
					status: 400,
				}),
				false
			);
		}
	},
}).single('file');

const uploadImageMiddleware = (req, res, next) => {
	multerImage(req, res, (error) => {
		if (!error) return next();
		if (error.code === 'LIMIT_FILE_SIZE') {
			return next({
				status: 413,
				message: `The image is too large (max ${MAX_IMAGE_MB} MB)`,
			});
		}
		if (error instanceof multer.MulterError) {
			return next({ status: 400, message: error.message });
		}
		next(error);
	});
};

// Same idea for images: JPG, PNG or WebP by their first bytes
const isImageBuffer = (buffer) => {
	if (!buffer || buffer.length < 12) return false;
	const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
	const png = buffer.subarray(0, 8).equals(
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
	);
	const webp =
		buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
		buffer.subarray(8, 12).toString('latin1') === 'WEBP';
	return jpg || png || webp;
};

// Square, at most 512 px, stored as JPG
const uploadAvatarToCloudinary = (buffer, filename) => {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				resource_type: 'image',
				folder: AVATAR_FOLDER,
				public_id: filename,
				format: 'jpg',
				transformation: [
					{ width: 512, height: 512, crop: 'fill', gravity: 'face' },
				],
			},
			(error, result) => {
				if (error) reject(error);
				else resolve(result);
			}
		);
		stream.end(buffer);
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
	uploadImageMiddleware,
	uploadAvatarToCloudinary,
	isImageBuffer,
};
