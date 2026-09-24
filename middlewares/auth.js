import { verifyToken } from '../utils/authUtil.js';
import { getUserById } from '../services/userService.js';

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const unauthorized = (res, message) =>
	res.status(401).json({ status: 401, success: false, message });

// Checks the token, then that the account still exists, so a deleted user or a
// changed role takes effect right away instead of when the token expires.
export async function authenticateUser(req, res, next) {
	const header = req.headers.authorization;
	if (!header || !header.startsWith('Bearer ')) {
		return unauthorized(res, 'No token provided');
	}

	const decoded = verifyToken(header.replace('Bearer ', ''));
	if (!decoded) return unauthorized(res, 'Invalid or expired token');

	const user = await getUserById(decoded.userId);
	if (!user) return unauthorized(res, 'This account no longer exists');

	req.user = { userId: user.userId, username: user.username, role: user.role };
	next();
}

// Use after authenticateUser, e.g. router.use(authenticateUser, requireRole('admin'))
export function requireRole(...roles) {
	return (req, res, next) => {
		if (roles.includes(req.user?.role)) return next();
		res.status(403).json({
			status: 403,
			success: false,
			message: 'You do not have permission to do this',
		});
	};
}

// Public reads, logged-in writes. Used on every router that the public site reads from.
export function protectWrites(req, res, next) {
	if (READ_METHODS.includes(req.method)) return next();
	return authenticateUser(req, res, next);
}
