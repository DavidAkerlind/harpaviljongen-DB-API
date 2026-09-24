import { v4 as uuid } from 'uuid';
import User from '../models/user.js';

// "Anna" and "anna" count as the same username
const CASE_INSENSITIVE = { locale: 'sv', strength: 2 };

export async function getUser(username) {
	return User.findOne({ username: username?.trim() }).collation(
		CASE_INSENSITIVE
	);
}

export async function getUserById(userId) {
	return User.findOne({ userId });
}

export async function listUsers() {
	return User.find().sort({ role: 1, username: 1 }).collation(CASE_INSENSITIVE);
}

// password must already be hashed
export async function createUser({ username, password, role }) {
	return User.create({
		username,
		password,
		role,
		userId: uuid().substring(0, 5),
	});
}

export async function updateUserRole(userId, role) {
	return User.findOneAndUpdate(
		{ userId },
		{ role },
		{ new: true, runValidators: true }
	);
}

export async function deleteUser(userId) {
	return User.findOneAndDelete({ userId });
}

// Users created before roles existed were all admins
export async function ensureUserRoles() {
	const result = await User.updateMany(
		{ role: { $exists: false } },
		{ $set: { role: 'admin' } }
	);
	return result.modifiedCount;
}
