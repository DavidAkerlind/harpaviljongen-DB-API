import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const SECRET = process.env.SECRET;

export async function hashPassword(password) {
	const hashedPassword = await bcrypt.hash(password, 10);
	return hashedPassword;
}

export async function comparePasswords(password, hashedPassword) {
	const isSame = await bcrypt.compare(password, hashedPassword);
	return isSame;
}

export function signToken(payload) {
	const token = jwt.sign(payload, SECRET, { expiresIn: 60 * 60 });
	return token;
}

export function verifyToken(token) {
	try {
		const decoded = jwt.verify(token, SECRET);
		return decoded;
	} catch (error) {
		console.log(error.message);
	}
}
