import mongoose from 'mongoose';
import { qualityRating } from '../utils/heroQuality.js';

// The photos for the home page's hero, uploaded in the admin (Startbild) and stored in
// Cloudinary. The website shows the ones with shown: true, in order; the first of those is
// always shown first. Settings for the slideshow itself are in siteSettings.hero.
//   quality – 1–10 from the photo's size, see utils/heroQuality.js
//   focus   – the most important point of the photo in % from the top left, kept in view
//             when a screen of another shape cuts the photo (CSS object-position)

export const MAX_HERO_IMAGES = 30;

const qualitySchema = new mongoose.Schema(
	{
		score: { type: Number, required: true },
		desktop: { type: Number, required: true },
		phone: { type: Number, required: true },
	},
	{ _id: false }
);

const focusSchema = new mongoose.Schema(
	{
		x: { type: Number, default: 50, min: 0, max: 100 },
		y: { type: Number, default: 50, min: 0, max: 100 },
	},
	{ _id: false }
);

const heroImageSchema = new mongoose.Schema(
	{
		url: { type: String, required: true },
		publicId: { type: String, required: true },
		originalName: { type: String, default: '' },
		width: { type: Number, required: true },
		height: { type: Number, required: true },
		bytes: { type: Number },
		quality: { type: qualitySchema, required: true },
		shown: { type: Boolean, default: true },
		order: { type: Number, default: 0 },
		focus: { type: focusSchema, default: () => ({}) },
		uploadedAt: { type: Date, default: Date.now },
	},
	{
		versionKey: false,
		collection: 'heroimages',
		toJSON: {
			transform: (doc, ret) => ({
				id: String(ret._id),
				url: ret.url,
				originalName: ret.originalName,
				width: ret.width,
				height: ret.height,
				bytes: ret.bytes ?? null,
				quality: { ...ret.quality, rating: qualityRating(ret.quality.score) },
				shown: ret.shown,
				order: ret.order,
				focus: { x: ret.focus?.x ?? 50, y: ret.focus?.y ?? 50 },
				uploadedAt: ret.uploadedAt,
			}),
		},
	}
);

const HeroImage = mongoose.model('HeroImage', heroImageSchema);

export default HeroImage;
