// Shared rules for usernames and passwords. Return an error message, or null when fine.
const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{3,30}$/u;

export function usernameProblem(username) {
	return typeof username === 'string' && USERNAME_PATTERN.test(username)
		? null
		: 'Username must be 3–30 characters: letters, numbers, . _ or -';
}

export function passwordProblem(password) {
	if (typeof password !== 'string' || password.length < 8) {
		return 'Password must be at least 8 characters';
	}
	// bcrypt only uses the first 72 bytes
	if (Buffer.byteLength(password) > 72) {
		return 'Password can be at most 72 characters';
	}
	return null;
}
