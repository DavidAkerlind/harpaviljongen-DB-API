import OpeningHoursService from '../services/openingHoursService.js';
import { logActivity } from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';

const VALID_DAYS = [
	'Måndag',
	'Tisdag',
	'Onsdag',
	'Torsdag',
	'Fredag',
	'Lördag',
	'Söndag',
];

export class OpeningHoursController {
	static async getAllOpeningHours(req, res) {
		try {
			const hours = await OpeningHoursService.getAllOpeningHours();
			if (!hours?.length) {
				return res
					.status(404)
					.json(
						constructResObj(404, 'No opening hours found', false)
					);
			}
			res.json(
				constructResObj(
					200,
					'Opening hours retrieved successfully',
					true,
					hours
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async createOpeningHours(req, res) {
		try {
			const openingHoursData = req.body;

			// Validera input
			if (!openingHoursData.day || !openingHoursData.hours) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'Day and hours are required fields',
							false
						)
					);
			}

			const newOpeningHours =
				await OpeningHoursService.createOpeningHours(openingHoursData);

			res.status(201).json(
				constructResObj(
					201,
					'Opening hours created successfully',
					true,
					newOpeningHours
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateOpeningHours(req, res) {
		try {
			const { dayId } = req.params;
			const updates = req.body;

			// Validera input
			if (updates.hours && (!updates.hours.from || !updates.hours.to)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'Hours must contain both "from" and "to" fields',
							false
						)
					);
			}

			const updatedHours = await OpeningHoursService.updateOpeningHours(
				dayId,
				updates
			);
			if (updatedHours) {
				await logActivity(req, 'openingHours.update', {
					days: [updatedHours.day],
				});
			}
			if (!updatedHours) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Opening hours not found for day: ${dayId}`,
							false
						)
					);
			}

			res.json(
				constructResObj(
					200,
					'Opening hours updated successfully',
					true,
					updatedHours
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateAllOpeningHours(req, res) {
		try {
			const { days } = req.body ?? {};
			if (!Array.isArray(days) || days.length === 0) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'Body must be { days: [{ day, hours: { from, to } }] }',
							false
						)
					);
			}

			const cleaned = [];
			for (const entry of days) {
				const from = String(entry?.hours?.from ?? '').trim();
				const to = String(entry?.hours?.to ?? '').trim();
				const problem = !VALID_DAYS.includes(entry?.day)
					? `Invalid day: ${entry?.day}. Must be one of: ${VALID_DAYS.join(', ')}`
					: Boolean(from) !== Boolean(to)
					? `${entry.day}: fill in both "from" and "to", or leave both empty for closed`
					: from.length > 20 || to.length > 20
					? `${entry.day}: times can be at most 20 characters`
					: null;
				if (problem) {
					return res
						.status(400)
						.json(constructResObj(400, problem, false));
				}
				cleaned.push({ day: entry.day, hours: { from, to } });
			}

			// Which days actually changed, for "Senaste ändringar"
			const before = new Map(
				(await OpeningHoursService.getAllOpeningHours()).map((d) => [
					d.day,
					`${d.hours?.from ?? ''}–${d.hours?.to ?? ''}`,
				])
			);
			const changedDays = cleaned
				.filter((d) => before.get(d.day) !== `${d.hours.from}–${d.hours.to}`)
				.map((d) => d.day);

			const hours = await OpeningHoursService.updateAllOpeningHours(
				cleaned
			);
			if (changedDays.length) {
				await logActivity(req, 'openingHours.update', {
					days: VALID_DAYS.filter((day) => changedDays.includes(day)),
				});
			}
			res.json(
				constructResObj(
					200,
					'Opening hours updated successfully',
					true,
					hours
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateOpeningHoursByDay(req, res) {
		try {
			const { day } = req.params;
			const updates = req.body;

			const updatedHours =
				await OpeningHoursService.updateOpeningHoursByDay(day, updates);
			if (updatedHours) {
				await logActivity(req, 'openingHours.update', { days: [day] });
			}
			if (!updatedHours) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Opening hours not found for day: ${day}`,
							false
						)
					);
			}

			res.json(
				constructResObj(
					200,
					'Opening hours updated successfully',
					true,
					updatedHours
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
