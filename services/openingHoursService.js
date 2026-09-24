import OpeningHour from '../models/openingHour.js';

const DAY_ORDER = [
	'Måndag',
	'Tisdag',
	'Onsdag',
	'Torsdag',
	'Fredag',
	'Lördag',
	'Söndag',
];

class OpeningHoursService {
	async getAllOpeningHours() {
		const hours = await OpeningHour.find();
		return hours.sort(
			(a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
		);
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

	// Sparar hela veckan i ett anrop. Saknade dagar skapas.
	async updateAllOpeningHours(days) {
		await OpeningHour.bulkWrite(
			days.map(({ day, hours }) => ({
				updateOne: {
					filter: { day },
					update: { $set: { hours } },
					upsert: true,
				},
			}))
		);
		return await this.getAllOpeningHours();
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
