import mongoose from 'mongoose';

// The change log in the admin ("Senaste ändringar" and "Alla ändringar"): who changed what.
// type is e.g. 'pdf.upload', 'openingHours.update', 'user.create'; details depend on the type.

// Entries are deleted automatically when they are a year old (MongoDB TTL index,
// checked about once a minute). Admins can also delete older entries sooner.
export const RETENTION_DAYS = 365;
export const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

const activitySchema = new mongoose.Schema(
	{
		type: { type: String, required: true },
		userId: { type: String, index: true },
		// Saved as it was, so the entry still reads right after the user is renamed or deleted
		username: { type: String, required: true },
		details: { type: mongoose.Schema.Types.Mixed, default: {} },
		createdAt: { type: Date, default: Date.now, expires: RETENTION_SECONDS },
	},
	{
		versionKey: false,
		minimize: false,
		toJSON: {
			transform: (doc, ret) => ({
				id: String(ret._id),
				type: ret.type,
				userId: ret.userId ?? null,
				username: ret.username,
				details: ret.details,
				createdAt: ret.createdAt,
			}),
		},
	}
);

// Filter categories in the admin -> type prefixes
export const ACTIVITY_CATEGORIES = {
	// PDFs and the menus themselves
	menus: '(pdf|menu)',
	openingHours: 'openingHours',
	pages: 'pages',
	users: 'user',
	account: 'account',
	log: 'activity',
};

// DELETE /api/activity?olderThan=… -> how far back to keep
export const CLEAR_OPTIONS = ['30d', '3m', '6m', '1y', 'all'];

// The cut-off for an olderThan value: everything created before it is deleted.
// null for 'all'.
export function clearCutoff(olderThan, now = new Date()) {
	const cutoff = new Date(now);
	switch (olderThan) {
		case '30d':
			cutoff.setDate(cutoff.getDate() - 30);
			return cutoff;
		case '3m':
			cutoff.setMonth(cutoff.getMonth() - 3);
			return cutoff;
		case '6m':
			cutoff.setMonth(cutoff.getMonth() - 6);
			return cutoff;
		case '1y':
			cutoff.setFullYear(cutoff.getFullYear() - 1);
			return cutoff;
		default:
			return null;
	}
}

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
