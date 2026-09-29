import { isEmail, subscribeToNewsletter } from '../services/newsletterService.js';
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
		} catch (error) {
			const status = error.status ?? 500;
			res.status(status).json(constructResObj(status, error.message, false));
		}
	}
}
