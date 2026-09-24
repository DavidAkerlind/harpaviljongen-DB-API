// Small in-memory limiter against password guessing on /api/auth/login.
// Resets when the server restarts, which is fine for a single Render instance.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

export function loginLimiter(req, res, next) {
	const now = Date.now();
	const key = req.ip;
	const entry = attempts.get(key);

	if (!entry || now - entry.start > WINDOW_MS) {
		attempts.set(key, { start: now, count: 1 });
		return next();
	}

	entry.count += 1;
	if (entry.count > MAX_ATTEMPTS) {
		const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
		res.set('Retry-After', String(retryAfter));
		return res.status(429).json({
			status: 429,
			success: false,
			message: 'Too many login attempts, try again in a few minutes',
		});
	}
	next();
}

// Keep the map from growing forever
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of attempts) {
		if (now - entry.start > WINDOW_MS) attempts.delete(key);
	}
}, WINDOW_MS).unref();
