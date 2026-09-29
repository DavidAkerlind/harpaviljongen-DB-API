// For the website's newsletter signup (POST /api/newsletter): at most this many tries per
// IP address and window, so nobody can sign up a list of addresses in a loop. Kept in
// memory only, like the other limiters.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;
const tries = new Map();

export function newsletterLimiter(req, res, next) {
	const now = Date.now();
	const entry = tries.get(req.ip);
	if (!entry || now - entry.start > WINDOW_MS) {
		tries.set(req.ip, { start: now, count: 1 });
		return next();
	}
	entry.count += 1;
	if (entry.count > MAX_TRIES) {
		res.set('Retry-After', String(Math.ceil((entry.start + WINDOW_MS - now) / 1000)));
		return res.status(429).json({ status: 429, success: false, message: 'Too many tries, wait a few minutes' });
	}
	next();
}

setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of tries) {
		if (now - entry.start > WINDOW_MS) tries.delete(key);
	}
}, WINDOW_MS).unref();
