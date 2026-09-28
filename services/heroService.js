import mongoose from 'mongoose';
import HeroImage from '../models/heroImage.js';
import SiteSettings, { HERO_INTERVAL } from '../models/siteSettings.js';
import SiteSettingsService from './siteSettingsService.js';

const KEY = 'main';
// The widths the website can pick between (srcset); Cloudinary makes each one the first
// time it's asked for and then serves it from its CDN, as WebP/AVIF when the browser can
const WIDTHS = [720, 1280, 1920, 2560];
const HERO_SETTINGS = ['slideshow', 'intervalSeconds', 'shuffle'];

export const listHeroImages = () => HeroImage.find().sort({ order: 1, uploadedAt: 1 });

// { slideshow, intervalSeconds, shuffle } from the site settings document
export const heroSettingsOf = (settings) => ({
	slideshow: settings?.hero?.slideshow ?? true,
	intervalSeconds: settings?.hero?.intervalSeconds ?? HERO_INTERVAL.default,
	shuffle: settings?.hero?.shuffle ?? false,
});

export async function getHeroSettings() {
	return heroSettingsOf(await SiteSettingsService.getSettings());
}

// A message when the body isn't { slideshow?: boolean, intervalSeconds?: 5–30, shuffle?: boolean }
export function validateHeroSettings(body) {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return 'Body must be { slideshow?, intervalSeconds?, shuffle? }';
	}
	const keys = Object.keys(body);
	if (!keys.length) return 'Nothing to change';
	for (const key of keys) {
		if (!HERO_SETTINGS.includes(key)) {
			return `Unknown setting: ${key}. Must be one of: ${HERO_SETTINGS.join(', ')}`;
		}
	}
	for (const key of ['slideshow', 'shuffle']) {
		if (key in body && typeof body[key] !== 'boolean') return `${key} must be true or false`;
	}
	if ('intervalSeconds' in body) {
		const seconds = body.intervalSeconds;
		if (!Number.isInteger(seconds) || seconds < HERO_INTERVAL.min || seconds > HERO_INTERVAL.max) {
			return `intervalSeconds must be a whole number ${HERO_INTERVAL.min}–${HERO_INTERVAL.max}`;
		}
	}
	return null;
}

// Changes only what is sent; returns the settings after
export async function updateHeroSettings(changes) {
	const set = Object.fromEntries(
		Object.entries(changes).map(([key, value]) => [`hero.${key}`, value])
	);
	const settings = await SiteSettings.findOneAndUpdate(
		{ key: KEY },
		{ $set: set },
		{ new: true, upsert: true, setDefaultsOnInsert: true }
	);
	return heroSettingsOf(settings);
}

// A message when focus isn't { x: 0–100, y: 0–100 }
export function validateFocus(focus) {
	const ok = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
	if (!focus || typeof focus !== 'object' || !ok(focus.x) || !ok(focus.y)) {
		return 'focus must be { x: 0–100, y: 0–100 }';
	}
	return null;
}

export const roundFocus = ({ x, y }) => ({
	x: Math.round(x * 10) / 10,
	y: Math.round(y * 10) / 10,
});

// Saves a new order. ids must be every photo's id, exactly once.
// Returns the photos in the new order, or null when ids doesn't match the photos.
export async function reorderHeroImages(ids) {
	const images = await HeroImage.find().select('_id').lean();
	const known = new Set(images.map((image) => String(image._id)));
	const valid =
		Array.isArray(ids) &&
		ids.length === known.size &&
		new Set(ids).size === ids.length &&
		ids.every((id) => typeof id === 'string' && known.has(id));
	if (!valid) return null;
	if (ids.length) {
		await HeroImage.bulkWrite(
			ids.map((id, order) => ({
				updateOne: {
					filter: { _id: new mongoose.Types.ObjectId(id) },
					update: { $set: { order } },
				},
			}))
		);
	}
	return listHeroImages();
}

// Cloudinary makes the size and format on the fly from the address:
// …/image/upload/v1/hero-images/x.jpg -> …/image/upload/f_auto,q_auto,c_limit,w_1280/v1/hero-images/x.jpg
const sized = (url, width) =>
	url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);

// One photo as the website's slideshow uses it. Never larger than the photo itself.
export function siteSlide(image) {
	const largest = Math.min(image.width, WIDTHS.at(-1));
	const widths = [...new Set([...WIDTHS.filter((w) => w < largest), largest])];
	return {
		key: String(image._id),
		src: sized(image.url, largest),
		srcSet: widths.map((w) => `${sized(image.url, w)} ${w}w`).join(', '),
		position: `${image.focus?.x ?? 50}% ${image.focus?.y ?? 50}%`,
	};
}

// What the website's hero needs, for GET /api/site-config. slides is empty when no photo
// is shown; the website then shows its built-in photos with these settings.
export async function heroForSite(settings) {
	const images = await HeroImage.find({ shown: true }).sort({ order: 1, uploadedAt: 1 });
	return { ...heroSettingsOf(settings), slides: images.map(siteSlide) };
}
