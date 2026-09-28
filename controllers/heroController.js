import mongoose from 'mongoose';
import HeroImage, { MAX_HERO_IMAGES } from '../models/heroImage.js';
import {
	deleteFromCloudinary,
	isImageBuffer,
	uploadHeroToCloudinary,
} from '../services/cloudinaryService.js';
import {
	getHeroSettings,
	listHeroImages,
	reorderHeroImages,
	roundFocus,
	updateHeroSettings,
	validateFocus,
	validateHeroSettings,
} from '../services/heroService.js';
import { logActivity } from '../services/activityService.js';
import { heroQuality } from '../utils/heroQuality.js';
import { constructResObj } from '../utils/constructResObj.js';

const MAX_NAME = 100;

// The first photo the website shows (the first shown one in order), for the change log
const firstShown = (images) => images.find((image) => image.shown) ?? null;

const findImageOr404 = async (id, res) => {
	const image = mongoose.isValidObjectId(id) ? await HeroImage.findById(id) : null;
	if (!image) {
		res.status(404).json(constructResObj(404, `Photo not found: ${id}`, false));
	}
	return image;
};

const serverError = (res, error) =>
	res.status(500).json(constructResObj(500, 'Server error', false, error.message));

export class HeroController {
	// GET /api/hero – public: the settings and every photo in order, shown or not
	static async get(req, res) {
		try {
			const [settings, images] = await Promise.all([getHeroSettings(), listHeroImages()]);
			res.json(
				constructResObj(200, 'Hero retrieved successfully', true, { settings, images })
			);
		} catch (error) {
			serverError(res, error);
		}
	}

	// POST /api/hero/images (multipart: file) – added last and shown straight away
	static async upload(req, res) {
		try {
			if (!req.file) {
				return res.status(400).json(constructResObj(400, 'No file uploaded', false));
			}
			if (!isImageBuffer(req.file.buffer)) {
				return res
					.status(400)
					.json(constructResObj(400, 'The file is not a JPG, PNG or WebP image', false));
			}
			if ((await HeroImage.countDocuments()) >= MAX_HERO_IMAGES) {
				return res
					.status(409)
					.json(
						constructResObj(
							409,
							`At most ${MAX_HERO_IMAGES} photos. Delete one before uploading more.`,
							false
						)
					);
			}

			const result = await uploadHeroToCloudinary(req.file.buffer, `hero-${Date.now()}`);
			const last = await HeroImage.findOne().sort({ order: -1 });
			const image = await HeroImage.create({
				url: result.secure_url,
				publicId: result.public_id,
				originalName: req.file.originalname.slice(0, MAX_NAME),
				width: result.width,
				height: result.height,
				bytes: result.bytes,
				quality: heroQuality(result.width, result.height),
				order: (last?.order ?? -1) + 1,
			});
			await logActivity(req, 'hero.upload', {
				name: image.originalName,
				score: image.quality.score,
			});

			res.status(201).json(constructResObj(201, 'Photo uploaded successfully', true, image));
		} catch (error) {
			serverError(res, error);
		}
	}

	// PATCH /api/hero/images/:id { shown?, focus?: { x, y } }
	static async update(req, res) {
		try {
			const { shown, focus } = req.body ?? {};
			if (shown === undefined && focus === undefined) {
				return res
					.status(400)
					.json(constructResObj(400, 'Send shown and/or focus', false));
			}
			if (shown !== undefined && typeof shown !== 'boolean') {
				return res
					.status(400)
					.json(constructResObj(400, 'shown must be true or false', false));
			}
			const focusProblem = focus !== undefined ? validateFocus(focus) : null;
			if (focusProblem) {
				return res.status(400).json(constructResObj(400, focusProblem, false));
			}

			const image = await findImageOr404(req.params.id, res);
			if (!image) return;

			const details = { name: image.originalName };
			if (shown !== undefined && shown !== image.shown) {
				image.shown = shown;
				await image.save();
				await logActivity(req, shown ? 'hero.show' : 'hero.hide', details);
			}
			if (focus !== undefined) {
				const next = roundFocus(focus);
				if (next.x !== image.focus.x || next.y !== image.focus.y) {
					image.focus = next;
					await image.save();
					await logActivity(req, 'hero.focus', details);
				}
			}

			res.json(constructResObj(200, 'Photo updated successfully', true, image));
		} catch (error) {
			serverError(res, error);
		}
	}

	// PUT /api/hero/order { ids: [every photo's id, in the new order] }
	static async reorder(req, res) {
		try {
			const before = firstShown(await listHeroImages());
			const images = await reorderHeroImages(req.body?.ids);
			if (!images) {
				return res
					.status(409)
					.json(
						constructResObj(
							409,
							'ids must be every photo\'s id once. The photos may have changed, reload.',
							false
						)
					);
			}
			const first = firstShown(images);
			await logActivity(req, 'hero.order', {
				first: first?.originalName ?? null,
				firstChanged: String(first?._id) !== String(before?._id),
			});
			res.json(constructResObj(200, 'Order saved successfully', true, images));
		} catch (error) {
			serverError(res, error);
		}
	}

	// DELETE /api/hero/images/:id – also removes the file from Cloudinary
	static async remove(req, res) {
		try {
			const image = await findImageOr404(req.params.id, res);
			if (!image) return;

			try {
				await deleteFromCloudinary(image.publicId, 'image');
			} catch (error) {
				// Keep the record so the delete can be retried instead of leaving an orphan file
				return res
					.status(502)
					.json(
						constructResObj(
							502,
							`Could not delete the file from Cloudinary: ${error.message}`,
							false
						)
					);
			}

			await HeroImage.findByIdAndDelete(image._id);
			await logActivity(req, 'hero.delete', {
				name: image.originalName,
				wasShown: image.shown,
			});
			res.json(constructResObj(200, 'Photo deleted successfully', true, image));
		} catch (error) {
			serverError(res, error);
		}
	}

	// PUT /api/hero/settings { slideshow?, intervalSeconds?, shuffle? }
	static async updateSettings(req, res) {
		try {
			const problem = validateHeroSettings(req.body);
			if (problem) return res.status(400).json(constructResObj(400, problem, false));

			const before = await getHeroSettings();
			const settings = await updateHeroSettings(req.body);
			// e.g. [{ setting: 'intervalSeconds', value: 15 }]
			const changes = Object.entries(req.body)
				.filter(([setting, value]) => before[setting] !== value)
				.map(([setting, value]) => ({ setting, value }));
			if (changes.length) await logActivity(req, 'hero.settings', { changes });

			res.json(constructResObj(200, 'Hero settings saved successfully', true, settings));
		} catch (error) {
			serverError(res, error);
		}
	}
}
