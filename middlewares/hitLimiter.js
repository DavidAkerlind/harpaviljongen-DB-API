import express from 'express';

// For the website's page views (POST /api/site-config/seen and /api/analytics/hit).
// At most this many counted page views per IP address and window, so the numbers
// can't be pumped up by sending hits in a loop. Kept in memory only.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 100;
const hits = new Map();

export function hitLimiter(req, res, next) {
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

// The website sends the page view with navigator.sendBeacon as text/plain (no CORS preflight)
export const hitBody = express.text({ type: 'text/plain', limit: '2kb' });
