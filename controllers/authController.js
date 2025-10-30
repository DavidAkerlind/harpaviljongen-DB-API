import { getUser } from '../services/userService.js';
import { constructResObj } from '../utils/constructResObj.js';
import { v4 as uuid } from 'uuid';
import { registerUser } from '../services/userService.js';

import { comparePasswords, hashPassword } from '../utils/authUtil.js';

export class AuthController {
	static async login(req, res, next) {
		try {
			const { username, password } = req.body;
			const user = await getUser(username);
			if (user) {
				print(user.password);
				const isSame = comparePasswords(password, user.password);
				if (isSame) {
					res.json(
						constructResObj(
							200,
							`User logged in successfully ${password}`,
							true
						)
					);
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
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async logout(req, res) {
		res.json(constructResObj(200, 'User logged out successfully', true));
	}

	static async register(req, res, next) {
		try {
			const { username, password } = req.body;
			const existingUser = await getUser(username);
			const hashedPassword = await hashPassword(password);

			if (existingUser) {
				next({
					status: 400,
					message: 'Username already exists',
				});
			} else {
				const result = await registerUser({
					username: username,
					password: hashedPassword,
					userId: uuid().substring(0, 5),
				});
				if (result) {
					res.json(
						constructResObj(
							201,
							'User registered successfully',
							true
						)
					);
					return;
				} else {
					next({
						status: 400,
						message: 'Failed to register user',
					});
				}
			}
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
