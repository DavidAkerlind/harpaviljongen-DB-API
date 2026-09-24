import { getUser, getUserById, setPassword } from '../services/userService.js';
import { constructResObj } from '../utils/constructResObj.js';
import {
	comparePasswords,
	hashPassword,
	isAuthConfigured,
	signToken,
} from '../utils/authUtil.js';
import { passwordProblem } from '../utils/userValidation.js';

const tokenPayload = (user) => ({
	userId: user.userId,
	username: user.username,
	v: user.tokenVersion ?? 0,
});

const publicUser = (user) => ({
	userId: user.userId,
	username: user.username,
	role: user.role,
});

export class AuthController {
	static async login(req, res, next) {
		try {
			if (!isAuthConfigured()) {
				return res
					.status(500)
					.json(
						constructResObj(
							500,
							'JWT_SECRET is not set on the server',
							false
						)
					);
			}

			const { username, password } = req.body;
			const user = await getUser(username);
			// Same message for unknown user and wrong password so usernames can't be probed
			const isSame =
				user && (await comparePasswords(password, user.password));
			if (!isSame) {
				return next({
					status: 401,
					message: 'Username or password are incorrect',
				});
			}

			const token = signToken(tokenPayload(user));
			res.json(
				constructResObj(200, `User logged in successfully`, true, {
					token,
					user: publicUser(user),
				})
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	// The token lives in the client, so logout only confirms; the admin drops its copy
	static async logout(req, res) {
		res.json(constructResObj(200, 'User logged out successfully', true));
	}

	static async me(req, res) {
		res.json(
			constructResObj(200, 'Token is valid', true, {
				user: publicUser(req.user),
			})
		);
	}

	// PUT /api/auth/password – change your own password. Other devices are logged out;
	// this one gets a new token in the response.
	static async changePassword(req, res) {
		const { currentPassword, newPassword } = req.body ?? {};
		const user = await getUserById(req.user.userId);

		const isSame =
			typeof currentPassword === 'string' &&
			(await comparePasswords(currentPassword, user.password));
		if (!isSame) {
			// 400, not 401: the token is fine, only the password is wrong. Counted by the login limiter.
			res.locals.failedAttempt = true;
			return res
				.status(400)
				.json(
					constructResObj(400, 'Current password is incorrect', false)
				);
		}
		const problem = passwordProblem(newPassword);
		if (problem) {
			return res.status(400).json(constructResObj(400, problem, false));
		}

		await setPassword(user, await hashPassword(newPassword));
		const token = signToken(tokenPayload(user));
		res.json(
			constructResObj(200, 'Password changed successfully', true, {
				token,
				user: publicUser(user),
			})
		);
	}
}
