import {
	cloudinary,
	uploadToCloudinary,
} from '../services/cloudinaryService.js';
import MenuPdf from '../models/MenuPdf.js';
import { constructResObj } from '../utils/constructResObj.js';

export class MenuPdfController {
	static async uploadPdf(req, res) {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json(constructResObj(400, 'No file uploaded', false));
			}

			const { type } = req.body;

			if (!type) {
				return res
					.status(400)
					.json(constructResObj(400, 'Menu type is required', false));
			}

			const validTypes = ['food', 'wine', 'lunch', 'drinks'];
			if (!validTypes.includes(type)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							`Invalid type. Must be one of: ${validTypes.join(', ')}`,
							false,
						),
					);
			}

			const filename = `${type}-${Date.now()}`;
			const result = await uploadToCloudinary(req.file.buffer, filename);

			await MenuPdf.updateMany(
				{ type, isActive: true },
				{ isActive: false },
			);

			const newPdf = await MenuPdf.create({
				type,
				url: result.secure_url,
				publicId: result.public_id,
				isActive: true,
			});

			res.status(201).json(
				constructResObj(201, 'PDF uploaded successfully', true, newPdf),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	static async getActivePdf(req, res) {
		try {
			const { type } = req.query;

			if (!type) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'Query param ?type is required',
							false,
						),
					);
			}

			const validTypes = ['food', 'wine', 'lunch', 'drinks'];
			if (!validTypes.includes(type)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							`Invalid type. Must be one of: ${validTypes.join(', ')}`,
							false,
						),
					);
			}

			const pdf = await MenuPdf.findOne({ type, isActive: true });

			if (!pdf) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`No active PDF found for type: ${type}`,
							false,
						),
					);
			}

			res.json(
				constructResObj(
					200,
					'Active PDF retrieved successfully',
					true,
					pdf,
				),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	static async getAllPdfs(req, res) {
		try {
			const pdfs = await MenuPdf.find().sort({ uploadedAt: -1 });

			if (!pdfs?.length) {
				return res
					.status(404)
					.json(constructResObj(404, 'No PDFs found', false));
			}

			res.json(
				constructResObj(200, 'PDFs retrieved successfully', true, pdfs),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	static async deletePdf(req, res) {
		try {
			const { id } = req.params;

			const pdf = await MenuPdf.findById(id);

			if (!pdf) {
				return res
					.status(404)
					.json(constructResObj(404, `PDF not found: ${id}`, false));
			}

			await cloudinary.uploader.destroy(pdf.publicId, {
				resource_type: 'raw',
			});

			await MenuPdf.findByIdAndDelete(id);

			res.json(constructResObj(200, 'PDF deleted successfully', true));
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}
}
