import Activity from '../models/activity.js';

// Called after a successful change. A failed log entry never fails the change itself.
export async function logActivity(req, type, details = {}) {
	if (!req.user) return;
	try {
		await Activity.create({
			type,
			userId: req.user.userId,
			username: req.user.username,
			details,
		});
	} catch (error) {
		console.log('Could not save activity:', error.message);
	}
}

export async function listActivity(limit) {
	return Activity.find().sort({ createdAt: -1 }).limit(limit);
}
