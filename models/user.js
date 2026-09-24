import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// admin: everything, including managing users. employee: menus, opening hours and pages.
export const USER_ROLES = ['admin', 'employee'];

const userSchema = new Schema(
	{
		username: {
			type: String,
			unique: true,
			trim: true,
			minlength: 3,
			maxlength: 30,
			required: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 8,
		},
		userId: {
			type: String,
			required: true,
			unique: true,
		},
		// No default: users from before roles get 'admin' on startup (ensureUserRoles)
		role: {
			type: String,
			enum: USER_ROLES,
			required: true,
		},
		// Goes up by one on every password change. A token carries the version it was
		// signed with and stops working when they no longer match (see middlewares/auth.js).
		tokenVersion: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
		toJSON: {
			transform: (doc, ret) => ({
				userId: ret.userId,
				username: ret.username,
				role: ret.role,
				createdAt: ret.createdAt ?? null,
			}),
		},
	}
);

const User = mongoose.model('User', userSchema);

export default User;
