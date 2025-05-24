import Event from '../models/event.js';

class EventService {
	async getAllEvents() {
		return await Event.find().sort({ date: 1 });
	}

	async getEventById(eventId) {
		return await Event.findOne({ eventId: eventId });
	}

	async getEventsByType(type) {
		return await Event.find({ type });
	}

	async createEvent(eventData) {
		return await Event.create(eventData);
	}

	async updateEvent(eventId, updates) {
		return await Event.findOneAndUpdate(
			{ eventId: eventId },
			{ $set: updates },
			{ new: true }
		);
	}

	async deleteEvent(eventId) {
		return await Event.findOneAndDelete({ eventId: eventId });
	}

	async getFutureEvents() {
		const today = new Date().toISOString().split('T')[0];
		return await Event.find({ date: { $gte: today } }).sort({ date: 1 });
	}
}

export default new EventService();
