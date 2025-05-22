import OpeningHoursService from '../services/openingHoursService.js';
import { constructResObj } from '../utils/constructResObj.js';

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

	static async updateOpeningHoursByDay(req, res) {
		try {
			const { day } = req.params;
			const updates = req.body;

			const updatedHours =
				await OpeningHoursService.updateOpeningHoursByDay(day, updates);
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
