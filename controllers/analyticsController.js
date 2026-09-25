import {
	ANALYTICS_RANGES,
	getAnalytics,
	readHit,
	recordHit,
} from '../services/analyticsService.js';
import { constructResObj } from '../utils/constructResObj.js';

// The website sends its hit with navigator.sendBeacon as text/plain (no CORS preflight)
const parseBody = (body) => {
	if (typeof body !== 'string') return body ?? {};
	try {
		return JSON.parse(body);
	} catch {
		return {};
	}
};

export class AnalyticsController {
	// POST /api/analytics/hit { p: '/events', r: document.referrer } – public, from the website.
	// Always 204: nothing is sent back, and invalid hits and bots are simply not counted.
	static async hit(req, res) {
		const { p, r } = parseBody(req.body);
		const hit = readHit({
			path: p,
			referrer: r,
			origin: req.get('origin') || req.get('referer'),
			userAgent: req.get('user-agent'),
		});
		if (hit) {
			try {
				await recordHit(hit);
			} catch (error) {
				console.log('Could not count a page view:', error.message);
			}
		}
		res.status(204).end();
	}

	// GET /api/analytics?range=7d|30d|90d
	static async get(req, res) {
		const range = req.query.range ?? '7d';
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
		const data = await getAnalytics(range);
		res.json(constructResObj(200, 'Analytics retrieved successfully', true, data));
	}
}
