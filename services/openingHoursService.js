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
		// Validera att hours existerar om det finns med i updates
		if (
			updates.hours &&
			!('from' in updates.hours || 'to' in updates.hours)
		) {
			throw new Error('Hours must contain from and/or to fields');
		}

		// Tillåt tomma strängar
		if (updates.hours) {
			updates.hours.from = updates.hours.from ?? '';
			updates.hours.to = updates.hours.to ?? '';
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
		// Säkerställ att hours finns och har from/to egenskaper
		if (!data.hours) {
			data.hours = { from: '', to: '' };
		} else {
			data.hours.from = data.hours.from ?? '';
			data.hours.to = data.hours.to ?? '';
		}
		return await OpeningHour.create(data);
	}

	async deleteOpeningHours(dayId) {
		return await OpeningHour.findByIdAndDelete(dayId);
	}
}

export default new OpeningHoursService();
