import { getUser } from '../services/userService.js';
import { constructResObj } from '../utils/constructResObj.js';
import {
	comparePasswords,
	isAuthConfigured,
	signToken,
} from '../utils/authUtil.js';

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

			const token = signToken({
				userId: user.userId,
				username: user.username,
			});
			res.json(
				constructResObj(200, `User logged in successfully`, true, {
					token,
					user: { username: user.username, role: user.role },
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
				user: { username: req.user.username, role: req.user.role },
			})
		);
	}
}
