import SiteSettings, {
	PAGE_PLACEMENTS,
	TOGGLEABLE_PAGES,
} from '../models/siteSettings.js';

const KEY = 'main';

class SiteSettingsService {
	// Returnerar sparade inställningar, eller standardvärden (allt dolt) om inget sparats än
	async getSettings() {
		const settings = await SiteSettings.findOne({ key: KEY });
		return settings ?? new SiteSettings({ key: KEY });
	}

	// Tar emot t.ex. { pages: { chambre: { navbar: true } } } och ändrar bara det som skickas
	async updateSettings(pages) {
		const set = {};
		for (const page of TOGGLEABLE_PAGES) {
			for (const placement of PAGE_PLACEMENTS) {
				const value = pages?.[page]?.[placement];
				if (value !== undefined) {
					set[`pages.${page}.${placement}`] = value;
				}
			}
		}

		return await SiteSettings.findOneAndUpdate(
			{ key: KEY },
			{ $set: set },
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		);
	}

	// Kollar att body bara innehåller kända sidor/platser med true/false
	validatePages(pages) {
		if (!pages || typeof pages !== 'object' || Array.isArray(pages)) {
			return 'Body must be { pages: { <page>: { navbar?: boolean, home?: boolean } } }';
		}
		for (const [page, placements] of Object.entries(pages)) {
			if (!TOGGLEABLE_PAGES.includes(page)) {
				return `Unknown page: ${page}. Must be one of: ${TOGGLEABLE_PAGES.join(', ')}`;
			}
			if (!placements || typeof placements !== 'object') {
				return `pages.${page} must be an object`;
			}
			for (const [placement, value] of Object.entries(placements)) {
				if (!PAGE_PLACEMENTS.includes(placement)) {
					return `Unknown placement: ${placement}. Must be one of: ${PAGE_PLACEMENTS.join(', ')}`;
				}
				if (typeof value !== 'boolean') {
					return `pages.${page}.${placement} must be true or false`;
				}
			}
		}
		return null;
	}
}

export default new SiteSettingsService();
