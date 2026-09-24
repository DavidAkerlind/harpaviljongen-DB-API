import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
// JWT_SECRET is the documented name; SECRET is kept so an older Render setup keeps working
const SECRET = process.env.JWT_SECRET || process.env.SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

export function isAuthConfigured() {
	return Boolean(SECRET);
}

export async function hashPassword(password) {
	const hashedPassword = await bcrypt.hash(password, 10);
	return hashedPassword;
}

export async function comparePasswords(password, hashedPassword) {
	const isSame = await bcrypt.compare(password, hashedPassword);
	return isSame;
}

export function signToken(payload) {
	const token = jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
	return token;
}

export function verifyToken(token) {
	if (!SECRET) return null;
	try {
		const decoded = jwt.verify(token, SECRET);
		return decoded;
	} catch (error) {
		return null;
	}
}
