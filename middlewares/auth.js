import { verifyToken } from '../utils/authUtil.js';

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export function authenticateUser(req, res, next) {
	const header = req.headers.authorization;
	if (!header || !header.startsWith('Bearer ')) {
		return res.status(401).json({
			status: 401,
			success: false,
			message: 'No token provided',
		});
	}

	const token = header.replace('Bearer ', '');
	const decoded = verifyToken(token);
	if (!decoded) {
		return res.status(401).json({
			status: 401,
			success: false,
			message: 'Invalid or expired token',
		});
	}

	req.user = { userId: decoded.userId, username: decoded.username };
	next();
}

// Public reads, logged-in writes. Used on every router that the public site reads from.
export function protectWrites(req, res, next) {
	if (READ_METHODS.includes(req.method)) return next();
	return authenticateUser(req, res, next);
}
