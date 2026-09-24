import mongoose from 'mongoose';
import Activity, {
	ACTIVITY_CATEGORIES,
	RETENTION_SECONDS,
	clearCutoff,
} from '../models/activity.js';
import User from '../models/user.js';

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

// Current name and picture of the people behind the entries. Someone who has been
// deleted keeps the username saved in the entry.
async function withUsers(entries) {
	const ids = [...new Set(entries.map((e) => e.userId).filter(Boolean))];
	const users = await User.find({ userId: { $in: ids } });
	const byId = new Map(users.map((u) => [u.userId, u]));
	return entries.map((entry) => {
		const user = byId.get(entry.userId);
		return {
			...entry.toJSON(),
			user: {
				name: user ? user.name || user.username : entry.username,
				avatarUrl: user?.avatar?.url || null,
				deleted: !user,
			},
		};
	});
}

// filters: { from, to (Dates, to is exclusive), category, userId, before (entry id) }
export async function listActivity({ limit, before, from, to, category, userId }) {
	const filter = {};
	if (from || to) {
		filter.createdAt = {};
		if (from) filter.createdAt.$gte = from;
		if (to) filter.createdAt.$lt = to;
	}
	if (category) filter.type = { $regex: `^${ACTIVITY_CATEGORIES[category]}\\.` };
	if (userId) filter.userId = userId;

	// Newest first by time; _id breaks ties. The next page starts after the entry
	// with the id in `before` (or below that id if it has been deleted meanwhile).
	let pageFilter = filter;
	if (before) {
		const last = await Activity.findById(before);
		const after = last
			? {
					$or: [
						{ createdAt: { $lt: last.createdAt } },
						{ createdAt: last.createdAt, _id: { $lt: last._id } },
					],
				}
			: { _id: { $lt: before } };
		pageFilter = { $and: [filter, after] };
	}

	const [total, page] = await Promise.all([
		Activity.countDocuments(filter),
		Activity.find(pageFilter)
			.sort({ createdAt: -1, _id: -1 })
			.limit(limit + 1), // one extra tells whether there are more
	]);

	return {
		items: await withUsers(page.slice(0, limit)),
		total,
		hasMore: page.length > limit,
	};
}

// Everyone who appears in the log, for the user filter
export async function listActivityUsers() {
	const seen = await Activity.aggregate([
		{ $sort: { createdAt: -1, _id: -1 } },
		{ $group: { _id: '$userId', username: { $first: '$username' } } },
	]);
	const users = await User.find({ userId: { $in: seen.map((s) => s._id) } });
	const byId = new Map(users.map((u) => [u.userId, u]));
	return seen
		.filter((s) => s._id)
		.map((s) => {
			const user = byId.get(s._id);
			return {
				userId: s._id,
				name: user ? user.name || user.username : s.username,
				avatarUrl: user?.avatar?.url || null,
				deleted: !user,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

// Makes sure createdAt has the one-year auto-delete index. An older version had
// 180 days, a later one none at all; an index with other options is replaced.
export async function ensureActivityIndexes() {
	const indexes = await Activity.collection.indexes().catch(() => []);
	for (const index of indexes) {
		const onCreatedAt =
			Object.keys(index.key).length === 1 && index.key.createdAt === 1;
		if (onCreatedAt && index.expireAfterSeconds !== RETENTION_SECONDS) {
			await Activity.collection.dropIndex(index.name);
			console.log(
				`Activity log: replaced index ${index.name} (entries are now kept for 1 year)`
			);
		}
	}
	await Activity.createIndexes();
}

// Deletes entries older than '30d', '3m', '6m', '1y', or 'all'. Returns how many.
export async function clearActivity(olderThan) {
	const cutoff = clearCutoff(olderThan);
	const result = await Activity.deleteMany(
		cutoff ? { createdAt: { $lt: cutoff } } : {}
	);
	return result.deletedCount;
}

export const isActivityId = (id) => mongoose.isValidObjectId(id);
