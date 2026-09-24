// Small in-memory limiter against password guessing on /api/auth/login and /api/auth/password.
// Only failed attempts count (401, or res.locals.failedAttempt set by the controller), so staff
// logging in from the same wifi don't lock each other out.
// Resets when the server restarts, which is fine for a single Render instance.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const failedAttempts = new Map();

export function loginLimiter(req, res, next) {
	const now = Date.now();
	const key = req.ip;
	let entry = failedAttempts.get(key);
	if (entry && now - entry.start > WINDOW_MS) {
		failedAttempts.delete(key);
		entry = undefined;
	}

	if (entry && entry.count >= MAX_FAILED_ATTEMPTS) {
		const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
		res.set('Retry-After', String(retryAfter));
		return res.status(429).json({
			status: 429,
			success: false,
			message: 'Too many login attempts, try again in a few minutes',
		});
	}

	res.on('finish', () => {
		if (res.statusCode !== 401 && !res.locals.failedAttempt) return;
		const current = failedAttempts.get(key);
		if (current) current.count += 1;
		else failedAttempts.set(key, { start: Date.now(), count: 1 });
	});
	next();
}

// Keep the map from growing forever
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of failedAttempts) {
		if (now - entry.start > WINDOW_MS) failedAttempts.delete(key);
	}
}, WINDOW_MS).unref();
