import OpeningHour from '../models/openingHour.js';

class OpeningHoursService {
	async getAllOpeningHours() {
		return await OpeningHour.find().sort({ dayOrder: 1 });
	}

	async updateOpeningHours(dayId, updates) {
		// Validera att hours har rätt format om det finns med i updates
		if (updates.hours && (!updates.hours.from || !updates.hours.to)) {
			throw new Error('Hours must contain both "from" and "to" fields');
		}

		return await OpeningHour.findByIdAndUpdate(
			dayId,
			{ $set: updates },
			{ new: true }
		);
	}

	// Ny metod för att uppdatera via dag-namn
	async updateOpeningHoursByDay(day, updates) {
		// Validera att hours har rätt format om det finns med i updates
		if (updates.hours && (!updates.hours.from || !updates.hours.to)) {
			throw new Error('Hours must contain both "from" and "to" fields');
		}
		return await OpeningHour.findOneAndUpdate(
			{ day },
			{ $set: updates },
			{ new: true }
		);
	}

	async createOpeningHours(data) {
		const validDays = [
			'Måndag',
			'Tisdag',
			'Onsdag',
			'Torsdag',
			'Fredag',
			'Lördag',
			'Söndag',
		];
		if (!validDays.includes(data.day)) {
			throw new Error(
				`Invalid day. Must be one of: ${validDays.join(', ')}`
			);
		}
		return await OpeningHour.create(data);
	}

	async deleteOpeningHours(dayId) {
		return await OpeningHour.findByIdAndDelete(dayId);
	}
}

export default new OpeningHoursService();
