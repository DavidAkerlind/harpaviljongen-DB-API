import EventService from '../services/eventService.js';
import { constructResObj } from '../utils/constructResObj.js';
import { v4 as uuidv4 } from 'uuid';

export class EventController {
	static async getAllEvents(req, res) {
		try {
			const events = await EventService.getAllEvents();
			if (!events?.length) {
				return res
					.status(404)
					.json(constructResObj(404, 'No events found', false));
			}
			res.json(
				constructResObj(
					200,
					'Events retrieved successfully',
					true,
					events
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async getEventById(req, res) {
		try {
			const { eventId } = req.params;
			const event = await EventService.getEventById(eventId);
			if (!event) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Event not found with id: ${eventId}`,
							false
						)
					);
			}
			res.json(
				constructResObj(
					200,
					'Event retrieved successfully',
					true,
					event
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
	/*
    {
    \"title\": \"DJ Kväll med DJ exempel\",
    \"shortDescription\": \"Dans och cocktails hela kvällen!\", MAX 100 bokstäver
    \"longDescription\": \"Kom och njut av en fantastisk kväll med vår resident DJ som spelar det bästa inom house och disco. Vi serverar specialdesignade cocktails hela kvällen.\",
    \"date\": \"2025-06-14\",
    \"startTime\": \"20:00\",
    \"endTime\": \"01:00\",
    \"type\": \"dj\",
    \"image\": \"/src/assets/pictures/event.png\"
}
    */

	static async createEvent(req, res) {
		try {
			const eventData = req.body;

			// Validate required fields
			const requiredFields = [
				'title',
				'shortDescription',
				'longDescription',
				'date',
				'startTime',
				'endTime',
				'type',
			];
			const missingFields = requiredFields.filter(
				(field) => !eventData[field]
			);

			if (missingFields.length > 0) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							`Missing required fields: ${missingFields.join(
								', '
							)}`,
							false
						)
					);
			}

			// Validate short description length
			if (eventData.shortDescription.length > 100) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'Short description cannot be longer than 100 characters',
							false
						)
					);
			}

			eventData = {
				eventId: uuidv4().slice(0, 8),
				title: eventData.title,
				shortDescription: eventData.shortDescription,
				longDescription: eventData.longDescription,
				date: eventData.date,
				startTime: eventData.startTime,
				endTime: eventData.endTime,
				type: eventData.type,
			};

			const event = await EventService.createEvent(eventData);
			res.status(201).json(
				constructResObj(201, 'Event created successfully', true, event)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateEvent(req, res) {
		try {
			const { eventId } = req.params;
			const event = await EventService.updateEvent(eventId, req.body);
			if (!event) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Event not found with id: ${eventId}`,
							false
						)
					);
			}
			res.json(
				constructResObj(200, 'Event updated successfully', true, event)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async deleteEvent(req, res) {
		try {
			const { eventId } = req.params;
			const event = await EventService.deleteEvent(eventId);
			if (!event) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Event not found with id: ${eventId}`,
							false
						)
					);
			}
			res.json(
				constructResObj(200, 'Event deleted successfully', true, event)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async getFutureEvents(req, res) {
		try {
			const events = await EventService.getFutureEvents();
			if (!events?.length) {
				return res
					.status(404)
					.json(
						constructResObj(404, 'No future events found', false)
					);
			}
			res.json(
				constructResObj(
					200,
					'Future events retrieved successfully',
					true,
					events
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
