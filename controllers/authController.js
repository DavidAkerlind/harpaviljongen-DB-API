import { getUser } from '../services/userService.js';
import { constructResObj } from '../utils/constructResObj.js';
import { v4 as uuid } from 'uuid';
import { registerUser } from '../services/userService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const SECRET = process.env.SECRET;

export class AuthController {
	static async login(req, res, next) {
		try {
			const { username, password } = req.body;
			const user = await getUser(username);
			if (user) {
				const isSame = await bcrypt.compare(password, user.password);
				if (isSame) {
					const token = jwt.sing(
						{
							userId: user.userId,
							username: user.username,
						},
						SECRET,
						{ expiresIn: 60 * 60 }
					);
					res.json(
						constructResObj(
							200,
							'User logged in successfully',
							true,
							{ token: `Bearer ${token}`, userId: user.userId }
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
			const hashedPassword = await bcrypt.hash(password, 10);

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
