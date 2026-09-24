import mongoose from 'mongoose';

// "Senaste ändringar" in the admin: who changed what. Entries are removed after 180 days.
// type is e.g. 'pdf.upload', 'openingHours.update', 'user.create'; details depend on the type.
const activitySchema = new mongoose.Schema(
	{
		type: { type: String, required: true },
		userId: { type: String },
		// Saved as it was, so the entry still reads right after the user is renamed or deleted
		username: { type: String, required: true },
		details: { type: mongoose.Schema.Types.Mixed, default: {} },
		createdAt: { type: Date, default: Date.now, expires: '180d' },
	},
	{
		versionKey: false,
		minimize: false,
		toJSON: {
			transform: (doc, ret) => ({
				id: String(ret._id),
				type: ret.type,
				username: ret.username,
				details: ret.details,
				createdAt: ret.createdAt,
			}),
		},
	}
);

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
