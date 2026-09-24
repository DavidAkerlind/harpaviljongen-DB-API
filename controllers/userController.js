import { USER_ROLES } from '../models/user.js';
import {
	createUser,
	deleteUser,
	getUser,
	getUserById,
	listUsers,
	updateUserRole,
} from '../services/userService.js';
import { hashPassword } from '../utils/authUtil.js';
import { constructResObj } from '../utils/constructResObj.js';

const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{3,30}$/u;
const invalidRoleMessage = `Invalid role. Must be one of: ${USER_ROLES.join(', ')}`;

const fail = (res, status, message) =>
	res.status(status).json(constructResObj(status, message, false));

// Only admins reach these (see routes/userRouter.js)
export class UserController {
	static async listUsers(req, res) {
		const users = await listUsers();
		res.json(constructResObj(200, 'Users retrieved successfully', true, users));
	}

	static async createUser(req, res) {
		const username =
			typeof req.body?.username === 'string' ? req.body.username.trim() : '';
		const { password, role = 'employee' } = req.body ?? {};

		if (!USERNAME_PATTERN.test(username)) {
			return fail(
				res,
				400,
				'Username must be 3–30 characters: letters, numbers, . _ or -'
			);
		}
		if (typeof password !== 'string' || password.length < 8) {
			return fail(res, 400, 'Password must be at least 8 characters');
		}
		// bcrypt only uses the first 72 bytes
		if (Buffer.byteLength(password) > 72) {
			return fail(res, 400, 'Password can be at most 72 characters');
		}
		if (!USER_ROLES.includes(role)) {
			return fail(res, 400, invalidRoleMessage);
		}
		if (await getUser(username)) {
			return fail(res, 409, 'Username already exists');
		}

		const user = await createUser({
			username,
			password: await hashPassword(password),
			role,
		});
		res
			.status(201)
			.json(constructResObj(201, 'User created successfully', true, user));
	}

	static async updateUser(req, res) {
		const { userId } = req.params;
		const { role } = req.body ?? {};

		if (!USER_ROLES.includes(role)) {
			return fail(res, 400, invalidRoleMessage);
		}
		// Also guarantees there is always at least one admin left
		if (userId === req.user.userId) {
			return fail(res, 400, "You can't change your own role");
		}

		const user = await updateUserRole(userId, role);
		if (!user) return fail(res, 404, `User not found: ${userId}`);
		res.json(constructResObj(200, 'User updated successfully', true, user));
	}

	static async deleteUser(req, res) {
		const { userId } = req.params;

		if (userId === req.user.userId) {
			return fail(res, 400, "You can't delete your own account");
		}
		const user = await getUserById(userId);
		if (!user) return fail(res, 404, `User not found: ${userId}`);
		if (user.role !== 'employee') {
			return fail(
				res,
				403,
				'Only employee accounts can be deleted. Change the role to employee first.'
			);
		}

		await deleteUser(userId);
		res.json(constructResObj(200, 'User deleted successfully', true, user));
	}
}
