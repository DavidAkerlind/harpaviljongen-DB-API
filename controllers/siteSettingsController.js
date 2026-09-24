import SiteSettingsService from '../services/siteSettingsService.js';
import { logActivity } from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';

export class SiteSettingsController {
	static async getSettings(req, res) {
		try {
			const settings = await SiteSettingsService.getSettings();
			res.json(
				constructResObj(
					200,
					'Site settings retrieved successfully',
					true,
					settings
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateSettings(req, res) {
		try {
			const { pages } = req.body ?? {};
			const problem = SiteSettingsService.validatePages(pages);
			if (problem) {
				return res
					.status(400)
					.json(constructResObj(400, problem, false));
			}

			const before = await SiteSettingsService.getSettings();
			const settings = await SiteSettingsService.updateSettings(pages);

			// e.g. [{ page: 'chambre', placement: 'navbar', value: true }]
			const changes = Object.entries(pages).flatMap(([page, placements]) =>
				Object.entries(placements)
					.filter(([placement, value]) => before.pages[page][placement] !== value)
					.map(([placement, value]) => ({ page, placement, value }))
			);
			if (changes.length) {
				await logActivity(req, 'pages.update', { changes });
			}
			res.json(
				constructResObj(
					200,
					'Site settings updated successfully',
					true,
					settings
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
