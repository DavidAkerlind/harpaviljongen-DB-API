import mongoose from 'mongoose';
import {
	deleteFromCloudinary,
	isPdfBuffer,
	uploadToCloudinary,
} from '../services/cloudinaryService.js';
import MenuPdf from '../models/MenuPdf.js';
import MenuList from '../models/menuList.js';
import { getMenuList } from '../services/menuListService.js';
import { logActivity } from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';

const MAX_TITLE = 100;
// menuLabel is saved so the log still reads right after the menu is renamed or deleted
const pdfDetails = async (pdf) => ({
	pdfType: pdf.type,
	menuLabel: (await getMenuList(pdf.type))?.label ?? null,
	title: pdf.title,
});

const invalidTypeMessage = 'Invalid type. Must be the type of a menu, see GET /api/menu-lists';
const isMenuType = async (type) =>
	typeof type === 'string' && Boolean(await MenuList.exists({ type }));

// Multipart form fields always arrive as strings
const isTruthy = (value) => value === true || value === 'true' || value === '1';

const findPdfOr404 = async (id, res) => {
	if (!mongoose.isValidObjectId(id)) {
		res.status(404).json(constructResObj(404, `PDF not found: ${id}`, false));
		return null;
	}
	const pdf = await MenuPdf.findById(id);
	if (!pdf) {
		res.status(404).json(constructResObj(404, `PDF not found: ${id}`, false));
		return null;
	}
	return pdf;
};

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

			if (!(await isMenuType(type))) {
				return res
					.status(400)
					.json(constructResObj(400, invalidTypeMessage, false));
			}

			if (!isPdfBuffer(req.file.buffer)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'The file is not a valid PDF',
							false,
						),
					);
			}

			const title = (
				req.body.title?.trim() ||
				req.file.originalname.replace(/\.pdf$/i, '')
			).slice(0, MAX_TITLE);
			const activate = isTruthy(req.body.activate);

			const filename = `${type}-${Date.now()}`;
			const result = await uploadToCloudinary(req.file.buffer, filename);

			if (activate) {
				await MenuPdf.updateMany(
					{ type, isActive: true },
					{ isActive: false },
				);
			}

			const newPdf = await MenuPdf.create({
				type,
				title,
				originalName: req.file.originalname,
				bytes: req.file.size,
				url: result.secure_url,
				publicId: result.public_id,
				resourceType: result.resource_type,
				isActive: activate,
			});
			await logActivity(req, 'pdf.upload', {
				...(await pdfDetails(newPdf)),
				activated: activate,
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

			if (!(await isMenuType(type))) {
				return res
					.status(400)
					.json(constructResObj(400, invalidTypeMessage, false));
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

	// GET /api/menu-pdfs?type=food – newest first, empty list when none
	static async getAllPdfs(req, res) {
		try {
			const { type } = req.query;
			if (type && !(await isMenuType(type))) {
				return res
					.status(400)
					.json(constructResObj(400, invalidTypeMessage, false));
			}

			const pdfs = await MenuPdf.find(type ? { type } : {}).sort({
				uploadedAt: -1,
			});

			res.json(
				constructResObj(200, 'PDFs retrieved successfully', true, pdfs),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	// Makes this PDF the one shown on the website; the previous active one of the same type is turned off
	static async activatePdf(req, res) {
		try {
			const pdf = await findPdfOr404(req.params.id, res);
			if (!pdf) return;

			await MenuPdf.updateMany(
				{ type: pdf.type, isActive: true, _id: { $ne: pdf._id } },
				{ isActive: false },
			);
			const wasActive = pdf.isActive;
			pdf.isActive = true;
			await pdf.save();
			if (!wasActive) await logActivity(req, 'pdf.activate', await pdfDetails(pdf));

			res.json(
				constructResObj(200, 'PDF activated successfully', true, pdf),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	// The website falls back to its placeholder PDF when no PDF of a type is active
	static async deactivatePdf(req, res) {
		try {
			const pdf = await findPdfOr404(req.params.id, res);
			if (!pdf) return;

			const wasActive = pdf.isActive;
			pdf.isActive = false;
			await pdf.save();
			if (wasActive) await logActivity(req, 'pdf.deactivate', await pdfDetails(pdf));

			res.json(
				constructResObj(200, 'PDF deactivated successfully', true, pdf),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	// PATCH /api/menu-pdfs/:id { title } – the name shown in the admin
	static async renamePdf(req, res) {
		try {
			const title =
				typeof req.body?.title === 'string' ? req.body.title.trim() : '';
			if (!title || title.length > MAX_TITLE) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							`Title must be 1–${MAX_TITLE} characters`,
							false,
						),
					);
			}
			const pdf = await findPdfOr404(req.params.id, res);
			if (!pdf) return;

			const from = pdf.title;
			if (from !== title) {
				pdf.title = title;
				await pdf.save();
				await logActivity(req, 'pdf.rename', { ...(await pdfDetails(pdf)), from });
			}

			res.json(constructResObj(200, 'PDF renamed successfully', true, pdf));
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}

	static async deletePdf(req, res) {
		try {
			const pdf = await findPdfOr404(req.params.id, res);
			if (!pdf) return;

			try {
				await deleteFromCloudinary(pdf.publicId, pdf.resourceType);
			} catch (error) {
				// Keep the record so the delete can be retried instead of leaving an orphan file
				return res
					.status(502)
					.json(
						constructResObj(
							502,
							`Could not delete the file from Cloudinary: ${error.message}`,
							false,
						),
					);
			}

			await MenuPdf.findByIdAndDelete(pdf._id);
			await logActivity(req, 'pdf.delete', {
				...(await pdfDetails(pdf)),
				wasActive: pdf.isActive,
			});

			res.json(
				constructResObj(200, 'PDF deleted successfully', true, pdf),
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message),
			);
		}
	}
}
