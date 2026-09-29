import SiteSettingsService from '../services/siteSettingsService.js';
import MenuPdf from '../models/MenuPdf.js';
import { listMenuLists } from '../services/menuListService.js';
import { heroForSite } from '../services/heroService.js';
import { newsletterConnected } from '../services/newsletterService.js';
import { constructResObj } from '../utils/constructResObj.js';

export class SiteConfigController {
	// Allt hemsidan behöver för navbar och startsidans knappar, i ett anrop
	static async getSiteConfig(req, res) {
		try {
			const settings = await SiteSettingsService.getSettings();
			const [menuLists, activePdfs, hero] = await Promise.all([
				listMenuLists(),
				MenuPdf.find({ isActive: true }),
				heroForSite(settings),
			]);

			const activeFor = (type) => {
				const pdf = activePdfs.find((p) => p.type === type);
				return pdf
					? { url: pdf.url, title: pdf.title, uploadedAt: pdf.uploadedAt }
					: null;
			};

			// menus: { food: {...} | null, wine: ... } – read by older versions of the website
			const menus = Object.fromEntries(
				menuLists.map((menu) => [menu.type, activeFor(menu.type)])
			);

			res.json(
				constructResObj(200, 'Site config retrieved successfully', true, {
					pages: settings.toJSON().pages,
					menus,
					// In button order. url is null when no PDF is active; the website then
					// shows its placeholder for Meny/Vinlista (builtIn) and hides the others.
					menuLists: menuLists.map((menu) => ({
						type: menu.type,
						label: menu.label,
						navbar: menu.navbar,
						home: menu.home,
						builtIn: menu.builtIn,
						url: activeFor(menu.type)?.url ?? null,
					})),
					// The home page's photos: { slideshow, intervalSeconds, shuffle, slides }.
					// slides is empty when none is uploaded and shown; the website then
					// shows its built-in photos.
					hero,
					// Whether the newsletter signup works (GETANEWSLETTER_FORM_LINK is set);
					// the website hides its signup field when false
					newsletter: newsletterConnected(),
				})
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
