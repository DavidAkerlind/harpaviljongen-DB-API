import { ACTIVITY_CATEGORIES } from '../models/activity.js';
import {
	isActivityId,
	listActivity,
	listActivityUsers,
} from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';

const fail = (res, message) =>
	res.status(400).json(constructResObj(400, message, false));

const parseDate = (value) => {
	if (value === undefined || value === '') return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

export class ActivityController {
	// GET /api/activity?limit=20&from=&to=&category=&userId=&before=
	// Newest first. from/to are ISO dates (to is exclusive). before = id of the last
	// entry you have, for the next page.
	static async listActivity(req, res) {
		const { before, category, userId } = req.query;
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const from = parseDate(req.query.from);
		const to = parseDate(req.query.to);

		if (from === null || to === null) {
			return fail(res, 'from and to must be dates, e.g. 2026-09-24T00:00:00Z');
		}
		if (category && !ACTIVITY_CATEGORIES[category]) {
			return fail(
				res,
				`Unknown category. Must be one of: ${Object.keys(ACTIVITY_CATEGORIES).join(', ')}`
			);
		}
		if (before && !isActivityId(before)) {
			return fail(res, 'before must be the id of an entry');
		}
		if (userId !== undefined && typeof userId !== 'string') {
			return fail(res, 'userId must be a string');
		}

		const result = await listActivity({
			limit,
			before,
			from,
			to,
			category,
			userId: userId || undefined,
		});
		res.json(
			constructResObj(200, 'Activity retrieved successfully', true, result)
		);
	}

	// GET /api/activity/users – everyone who appears in the log
	static async listUsers(req, res) {
		const users = await listActivityUsers();
		res.json(constructResObj(200, 'Users retrieved successfully', true, users));
	}
}
