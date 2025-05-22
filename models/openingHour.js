import mongoose from 'mongoose';
import { formatSwedishTime } from '../utils/formatSwedishTime.js';
const Schema = mongoose.Schema;

const VALID_DAYS = [
	'Måndag',
	'Tisdag',
	'Onsdag',
	'Torsdag',
	'Fredag',
	'Lördag',
	'Söndag',
];

const HoursSchema = new Schema(
	{
		from: { type: String, required: true }, // t.ex. "11:00"
		to: { type: String, required: true }, // t.ex. "21:00" eller "sent"
	},
	{ _id: false } // behövs inte egen _id för subobjektet
);

const OpeningHourSchema = new Schema(
	{
		day: {
			type: String,
			required: true,
			unique: true,
			enum: {
				values: VALID_DAYS,
				message: 'Day must be one of: ' + VALID_DAYS.join(', '),
			},
		}, // t.ex. "Tisdag"
		hours: { type: HoursSchema, required: true },
	},
	{ timestamps: true, collection: 'openinghours' }
);

// Anpassad JSON-konvertering för att formatera timestamps
OpeningHourSchema.set('toJSON', {
	transform: (doc, ret) => {
		if (ret.createdAt) {
			ret.createdAt = formatSwedishTime(new Date(ret.createdAt));
		}
		if (ret.updatedAt) {
			ret.updatedAt = formatSwedishTime(new Date(ret.updatedAt));
		}
		return ret;
	},
});

const OpeningHour = mongoose.model('OpeningHour', OpeningHourSchema);

export default OpeningHour;
