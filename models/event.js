import mongoose from 'mongoose';
import { formatSwedishTime } from '../utils/formatSwedishTime.js';

const Schema = mongoose.Schema;

const EVENT_TYPES = ['dj', 'wine', 'private', 'other'];

const EventSchema = new Schema(
	{
		title: {
			type: String,
			required: true,
			unique: true,
		},
		shortDescription: {
			type: String,
			required: true,
			maxLength: [
				100,
				'Short description cannot be longer than 100 characters',
			],
		},
		longDescription: {
			type: String,
			required: true,
		},
		date: {
			type: String,
			required: true,
		},
		startTime: {
			type: String,
			required: true,
		},
		endTime: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: {
				values: EVENT_TYPES,
				message: 'Type must be one of: ' + EVENT_TYPES.join(', '),
			},
		},
		image: {
			type: String,
			default: '/src/assets/pictures/event.png',
		},
	},
	{
		timestamps: true,
		collection: 'events',
	}
);

// ...existing code...

// Anpassad JSON-konvertering för timestamps
EventSchema.set('toJSON', {
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

export default mongoose.model('Event', EventSchema);
