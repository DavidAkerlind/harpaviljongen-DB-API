import mongoose from 'mongoose';

// The change log in the admin ("Senaste ändringar" and "Alla ändringar"): who changed what.
// Kept for good; it's a few hundred bytes per change.
// type is e.g. 'pdf.upload', 'openingHours.update', 'user.create'; details depend on the type.
const activitySchema = new mongoose.Schema(
	{
		type: { type: String, required: true },
		userId: { type: String, index: true },
		// Saved as it was, so the entry still reads right after the user is renamed or deleted
		username: { type: String, required: true },
		details: { type: mongoose.Schema.Types.Mixed, default: {} },
		createdAt: { type: Date, default: Date.now, index: true },
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
	menus: 'pdf',
	openingHours: 'openingHours',
	pages: 'pages',
	users: 'user',
	account: 'account',
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
