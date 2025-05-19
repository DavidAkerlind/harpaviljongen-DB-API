import { constructResObj } from '../utils/constructResObj.js';

export const fallbackController = (req, res) => {
	res.status(404).json(
		constructResObj(404, `Route '${req.originalUrl}' not found`, false)
	);
};
