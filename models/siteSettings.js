import mongoose from 'mongoose';
import { formatSwedishTime } from '../utils/formatSwedishTime.js';

const Schema = mongoose.Schema;

// Sidor som kan visas/döljas på hemsidan
export const TOGGLEABLE_PAGES = ['chambre', 'events', 'gallery'];
// navbar = länk i menyn, home = knapp på startsidan
export const PAGE_PLACEMENTS = ['navbar', 'home'];

const PageVisibilitySchema = new Schema(
	{
		navbar: { type: Boolean, default: false },
		home: { type: Boolean, default: false },
	},
	{ _id: false }
);

const pagesDefinition = Object.fromEntries(
	TOGGLEABLE_PAGES.map((page) => [
		page,
		{ type: PageVisibilitySchema, default: () => ({}) },
	])
);

// Ett enda dokument (key: 'main') med inställningar för hemsidan
const SiteSettingsSchema = new Schema(
	{
		key: { type: String, required: true, unique: true, default: 'main' },
		pages: {
			type: new Schema(pagesDefinition, { _id: false }),
			default: () => ({}),
		},
	},
	{ timestamps: true, collection: 'sitesettings' }
);

SiteSettingsSchema.set('toJSON', {
	transform: (doc, ret) => {
		delete ret._id;
		delete ret.__v;
		if (ret.createdAt) {
			ret.createdAt = formatSwedishTime(new Date(ret.createdAt));
		}
		if (ret.updatedAt) {
			ret.updatedAt = formatSwedishTime(new Date(ret.updatedAt));
		}
		return ret;
	},
});

const SiteSettings = mongoose.model('SiteSettings', SiteSettingsSchema);

export default SiteSettings;
