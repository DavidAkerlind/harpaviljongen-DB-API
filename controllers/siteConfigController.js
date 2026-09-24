import SiteSettingsService from '../services/siteSettingsService.js';
import MenuPdf from '../models/MenuPdf.js';
import { constructResObj } from '../utils/constructResObj.js';

// PDF-typer som hemsidan länkar till (Meny och Vinlista)
const SITE_MENU_TYPES = ['food', 'wine'];

export class SiteConfigController {
	// Allt hemsidan behöver för navbar och startsidans knappar, i ett anrop
	static async getSiteConfig(req, res) {
		try {
			const [settings, activePdfs] = await Promise.all([
				SiteSettingsService.getSettings(),
				MenuPdf.find({
					type: { $in: SITE_MENU_TYPES },
					isActive: true,
				}),
			]);

			const menus = Object.fromEntries(
				SITE_MENU_TYPES.map((type) => {
					const pdf = activePdfs.find((p) => p.type === type);
					return [
						type,
						pdf
							? {
									url: pdf.url,
									title: pdf.title,
									uploadedAt: pdf.uploadedAt,
							  }
							: null,
					];
				})
			);

			res.json(
				constructResObj(200, 'Site config retrieved successfully', true, {
					pages: settings.toJSON().pages,
					menus,
				})
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
