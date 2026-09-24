import { listActivity } from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';

export class ActivityController {
	// GET /api/activity?limit=20 – newest first, max 100
	static async listActivity(req, res) {
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const activity = await listActivity(limit);
		res.json(
			constructResObj(200, 'Activity retrieved successfully', true, activity)
		);
	}
}
