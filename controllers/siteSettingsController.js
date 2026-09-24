import SiteSettingsService from '../services/siteSettingsService.js';
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

			const settings = await SiteSettingsService.updateSettings(pages);
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
