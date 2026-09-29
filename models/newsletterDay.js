import mongoose from 'mongoose';
import { STAT_RETENTION_DAYS } from './siteStat.js';

// How many signed up with the website's newsletter field, per day (Stockholm time).
// Only a counter: the addresses themselves are only at Get a Newsletter.
const newsletterDaySchema = new mongoose.Schema(
	{
		day: { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
		signups: { type: Number, default: 0 },
		createdAt: {
			type: Date,
			default: Date.now,
			expires: STAT_RETENTION_DAYS * 24 * 60 * 60,
		},
	},
	{ versionKey: false, collection: 'newsletterdays' }
);

const NewsletterDay = mongoose.model('NewsletterDay', newsletterDaySchema);

export default NewsletterDay;
