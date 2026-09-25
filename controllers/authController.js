import {
	getUser,
	getUserById,
	removeAvatarFile,
	setPassword,
} from '../services/userService.js';
import {
	isImageBuffer,
	uploadAvatarToCloudinary,
} from '../services/cloudinaryService.js';
import { logActivity } from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';
import {
	comparePasswords,
	hashPassword,
	isAuthConfigured,
	signToken,
} from '../utils/authUtil.js';
import { passwordProblem, usernameProblem } from '../utils/userValidation.js';

const MAX_NAME = 50;
const MAX_WIDGETS = 30;
const WIDGET_SIZES = ['small', 'medium', 'large'];
const WIDGET_ID = /^[a-z][a-zA-Z0-9:_-]{0,49}$/;

// null (standard layout) or [{ id, size }] with unique ids
function dashboardProblem(widgets) {
	if (widgets === null) return null;
	if (!Array.isArray(widgets) || widgets.length > MAX_WIDGETS) {
		return `widgets must be null or a list of at most ${MAX_WIDGETS} widgets`;
	}
	const ids = new Set();
	for (const widget of widgets) {
		if (
			!widget ||
			typeof widget.id !== 'string' ||
			!WIDGET_ID.test(widget.id) ||
			!WIDGET_SIZES.includes(widget.size)
		) {
			return `Every widget needs an id and a size (${WIDGET_SIZES.join(', ')})`;
		}
		if (ids.has(widget.id)) return 'The same widget can only be added once';
		ids.add(widget.id);
	}
	return null;
}

const fail = (res, status, message) =>
	res.status(status).json(constructResObj(status, message, false));

const tokenPayload = (user) => ({
	userId: user.userId,
	username: user.username,
	v: user.tokenVersion ?? 0,
});

// { userId, username, name, avatarUrl, role, createdAt, dashboard }. The dashboard
// layout is only sent to its owner, not in the user list.
const publicUser = (user) => ({
	...user.toJSON(),
	dashboard: Array.isArray(user.dashboard)
		? user.dashboard.map(({ id, size }) => ({ id, size }))
		: null,
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
				user: publicUser(req.userDoc),
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
		await logActivity(req, 'account.password');
		const token = signToken(tokenPayload(user));
		res.json(
			constructResObj(200, 'Password changed successfully', true, {
				token,
				user: publicUser(user),
			})
		);
	}

	// PATCH /api/auth/me { username?, name? } – your own username and display name.
	// Your login keeps working; tokens are tied to the account, not the username.
	static async updateMe(req, res) {
		const user = req.userDoc;
		const { username, name } = req.body ?? {};
		const changes = {};

		if (username !== undefined) {
			const wanted = typeof username === 'string' ? username.trim() : '';
			// Sending the same username again is fine, even if it's from before the current rules
			if (wanted !== user.username) {
				const problem = usernameProblem(wanted);
				if (problem) return fail(res, 400, problem);
				const taken = await getUser(wanted);
				if (taken && taken.userId !== user.userId) {
					return fail(res, 409, 'Username already exists');
				}
				changes.username = { from: user.username, to: wanted };
				user.username = wanted;
			}
		}

		if (name !== undefined) {
			if (name !== null && typeof name !== 'string') {
				return fail(res, 400, 'name must be a string or null');
			}
			const wanted = (name ?? '').trim();
			if (wanted.length > MAX_NAME) {
				return fail(res, 400, `Name can be at most ${MAX_NAME} characters`);
			}
			if (wanted !== (user.name ?? '')) {
				changes.name = { from: user.name || null, to: wanted || null };
				user.name = wanted || undefined;
			}
		}

		if (Object.keys(changes).length) {
			await user.save();
			await logActivity(req, 'account.update', changes);
		}
		res.json(
			constructResObj(200, 'Profile updated successfully', true, {
				user: publicUser(user),
			})
		);
	}

	// PUT /api/auth/avatar – multipart "file": JPG, PNG or WebP, max 5 MB
	static async uploadAvatar(req, res) {
		if (!req.file) return fail(res, 400, 'No file uploaded');
		if (!isImageBuffer(req.file.buffer)) {
			return fail(res, 400, 'The file is not a JPG, PNG or WebP image');
		}

		const user = req.userDoc;
		const hadAvatar = Boolean(user.avatar?.url);
		const result = await uploadAvatarToCloudinary(
			req.file.buffer,
			`${user.userId}-${Date.now()}`
		);
		await removeAvatarFile(user);
		user.avatar = { url: result.secure_url, publicId: result.public_id };
		await user.save();
		await logActivity(req, 'account.avatar', {
			action: hadAvatar ? 'changed' : 'added',
		});

		res.json(
			constructResObj(200, 'Profile picture saved', true, {
				user: publicUser(user),
			})
		);
	}

	// DELETE /api/auth/avatar
	static async deleteAvatar(req, res) {
		const user = req.userDoc;
		if (user.avatar?.url) {
			await removeAvatarFile(user);
			user.avatar = undefined;
			await user.save();
			await logActivity(req, 'account.avatar', { action: 'removed' });
		}
		res.json(
			constructResObj(200, 'Profile picture removed', true, {
				user: publicUser(user),
			})
		);
	}

	// PUT /api/auth/dashboard { widgets: [{ id, size }] | null } – not in the change log,
	// it only affects your own Översikt
	static async saveDashboard(req, res) {
		const widgets = req.body?.widgets;
		const problem =
			widgets === undefined ? 'widgets is required' : dashboardProblem(widgets);
		if (problem) return fail(res, 400, problem);

		const user = req.userDoc;
		user.dashboard = widgets === null ? undefined : widgets.map(({ id, size }) => ({ id, size }));
		await user.save();
		res.json(
			constructResObj(200, 'Dashboard saved', true, { user: publicUser(user) })
		);
	}
}
