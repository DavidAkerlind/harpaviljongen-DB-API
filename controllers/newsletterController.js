import {
	getNewsletterStats,
	isEmail,
	recordSignup,
	subscribeToNewsletter,
} from '../services/newsletterService.js';
import { ANALYTICS_RANGES } from '../services/analyticsService.js';
import { constructResObj } from '../utils/constructResObj.js';

export class NewsletterController {
	// POST /api/newsletter { email } – the website's signup field
	static async subscribe(req, res) {
		const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
		// A hidden field people never see: a bot that fills it in gets a "yes" and nothing else
		if (req.body?.website) {
			return res.status(201).json(constructResObj(201, 'Subscribed', true));
		}
		if (!isEmail(email)) {
			return res.status(400).json(constructResObj(400, 'A valid email address is required', false));
		}
		try {
			await subscribeToNewsletter(email);
			res.status(201).json(constructResObj(201, 'Subscribed', true));
			// Counted for the admin's statistics; the signup has gone through either way
			recordSignup().catch((error) =>
				console.error('[newsletter] Could not count a signup:', error.message)
			);
		} catch (error) {
			const status = error.status ?? 500;
			res.status(status).json(constructResObj(status, error.message, false));
		}
	}

	// GET /api/newsletter/stats?range=7d|30d|90d – for the admin's Statistik page
	static async stats(req, res) {
		const range = req.query.range ?? '30d';
		if (!ANALYTICS_RANGES[range]) {
			return res
				.status(400)
				.json(
					constructResObj(
						400,
						`range must be one of: ${Object.keys(ANALYTICS_RANGES).join(', ')}`,
						false
					)
				);
		}
		const data = await getNewsletterStats(range);
		res.json(constructResObj(200, 'Newsletter statistics retrieved successfully', true, data));
	}
}
