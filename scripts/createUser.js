// Creates (or resets the password of) an admin user in the database from .env.
// Usage: npm run create-user -- <username> <password>
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import User from '../models/user.js';
import { hashPassword } from '../utils/authUtil.js';

dotenv.config();

const [username, password] = process.argv.slice(2);

if (!username || !password) {
	console.error('Usage: npm run create-user -- <username> <password>');
	process.exit(1);
}
if (username.length < 6 || password.length < 8) {
	console.error('Username needs at least 6 characters and password at least 8.');
	process.exit(1);
}

await mongoose.connect(process.env.CONNECTION_STRING);
console.log(`Connected to database "${mongoose.connection.name}"`);

const hashed = await hashPassword(password);
const existing = await User.findOne({ username });
if (existing) {
	existing.password = hashed;
	await existing.save();
	console.log(`Password updated for "${username}"`);
} else {
	await User.create({
		username,
		password: hashed,
		userId: uuid().substring(0, 5),
	});
	console.log(`User "${username}" created`);
}

await mongoose.disconnect();
