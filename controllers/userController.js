import { USER_ROLES } from '../models/user.js';
import {
	createUser,
	deleteUser,
	getUser,
	getUserById,
	listUsers,
	removeAvatarFile,
	setPassword,
	updateUserRole,
} from '../services/userService.js';
import { logActivity } from '../services/activityService.js';
import { hashPassword } from '../utils/authUtil.js';
import { constructResObj } from '../utils/constructResObj.js';
import { passwordProblem, usernameProblem } from '../utils/userValidation.js';

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

		const problem = usernameProblem(username) ?? passwordProblem(password);
		if (problem) return fail(res, 400, problem);
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
		await logActivity(req, 'user.create', {
			username: user.username,
			role: user.role,
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

		const before = await getUserById(userId);
		if (!before) return fail(res, 404, `User not found: ${userId}`);
		const user = await updateUserRole(userId, role);
		if (before.role !== role) {
			await logActivity(req, 'user.role', { username: user.username, role });
		}
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
		await removeAvatarFile(user);
		await logActivity(req, 'user.delete', { username: user.username });
		res.json(constructResObj(200, 'User deleted successfully', true, user));
	}

	// PUT /api/users/:userId/password – set a new password for someone who forgot theirs.
	// They are logged out everywhere. Your own password is changed with PUT /api/auth/password.
	static async resetPassword(req, res) {
		const { userId } = req.params;
		const { password } = req.body ?? {};

		if (userId === req.user.userId) {
			return fail(
				res,
				400,
				'Change your own password with PUT /api/auth/password'
			);
		}
		const problem = passwordProblem(password);
		if (problem) return fail(res, 400, problem);
		const user = await getUserById(userId);
		if (!user) return fail(res, 404, `User not found: ${userId}`);

		await setPassword(user, await hashPassword(password));
		await logActivity(req, 'user.password', { username: user.username });
		res.json(constructResObj(200, 'Password changed successfully', true, user));
	}
}
