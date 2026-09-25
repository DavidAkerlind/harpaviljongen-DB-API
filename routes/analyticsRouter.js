import express, { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticateUser } from '../middlewares/auth.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// At most this many counted page views per IP address and window, so the numbers
// can't be pumped up by sending hits in a loop. Kept in memory only.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 100;
const hits = new Map();

function hitLimiter(req, res, next) {
	const now = Date.now();
	const entry = hits.get(req.ip);
	if (!entry || now - entry.start > WINDOW_MS) {
		hits.set(req.ip, { start: now, count: 1 });
		return next();
	}
	entry.count += 1;
	if (entry.count > MAX_HITS) return res.status(429).end();
	next();
}

setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of hits) {
		if (now - entry.start > WINDOW_MS) hits.delete(key);
	}
}, WINDOW_MS).unref();

// POST hit – public, sent by the website on every page view, { "p": "/events", "r": "https://google.com/" }
router.post(
	'/hit',
	hitLimiter,
	express.text({ type: 'text/plain', limit: '2kb' }),
	AnalyticsController.hit
);

// GET – statistics for the admin, ?range=7d|30d|90d
router.get('/', authenticateUser, AnalyticsController.get);

// ==== FALLBACK ====
router.use(fallbackController);

export default router;
