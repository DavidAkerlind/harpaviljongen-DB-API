// Creates a user, or resets the password of an existing one, in the database from .env.
// Usage: npm run create-user -- <username> <password> [admin|employee]
// New users get the admin role unless employee is given. An existing user keeps
// their role unless one is given.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { USER_ROLES } from '../models/user.js';
import {
	createUser,
	ensureUserRoles,
	getUser,
	setPassword,
} from '../services/userService.js';
import { hashPassword } from '../utils/authUtil.js';

dotenv.config();

const [username, password, role] = process.argv.slice(2);

if (!username || !password) {
	console.error(
		'Usage: npm run create-user -- <username> <password> [admin|employee]'
	);
	process.exit(1);
}
if (username.length < 3 || password.length < 8) {
	console.error('Username needs at least 3 characters and password at least 8.');
	process.exit(1);
}
if (role && !USER_ROLES.includes(role)) {
	console.error(`Role must be one of: ${USER_ROLES.join(', ')}`);
	process.exit(1);
}

await mongoose.connect(process.env.CONNECTION_STRING);
console.log(`Connected to database "${mongoose.connection.name}"`);
await ensureUserRoles();

const hashed = await hashPassword(password);
const existing = await getUser(username);
if (existing) {
	if (role) existing.role = role;
	await setPassword(existing, hashed); // also logs them out everywhere
	console.log(
		`Password updated for "${existing.username}" (role: ${existing.role})`
	);
} else {
	const user = await createUser({
		username,
		password: hashed,
		role: role || 'admin',
	});
	console.log(`User "${user.username}" created (role: ${user.role})`);
}

await mongoose.disconnect();
