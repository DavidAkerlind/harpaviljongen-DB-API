import { getUser } from '../services/userService.js';
import { constructResObj } from '../utils/constructResObj.js';

export class AuthController {
	static async login(req, res, next) {
		try {
			const { username, password } = req.body;
			if (username && password) {
				const user = await getUser(username);
				if (user) {
					if (user.password === password) {
						global.user = user;
						res.json({
							success: true,
							message: 'User logged in successfully',
						});
					} else {
						next({
							status: 400,
							message: 'Username or password are incorrect',
						});
					}
				} else {
					next({
						status: 400,
						message: 'No user found',
					});
				}
			} else {
				next({
					status: 400,
					message: 'Both username and password are required',
				});
			}
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async logout(req, res) {
		global.user = null;
		res.json(constructResObj(200, 'User logged out successfully', true));
	}
}
