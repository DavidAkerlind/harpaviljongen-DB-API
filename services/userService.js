import User from '../models/user.js';

export async function getUser(username) {
	try {
		const user = User.findOne({ username: username });
		if (user) return user;
		else throw new Error('No user found');
	} catch (error) {
		console.log(error.message);
		return null;
	}
}

export async function registerUser(user) {
	try {
		const result = await User.create(user);
		return result;
	} catch (error) {
		console.log(error.message);
		return null;
	}
}
