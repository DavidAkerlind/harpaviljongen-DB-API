import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// Schema för individuella rätter/viner/snacks m.m.
const MenuItemSchema = new Schema(
	{
		id: { type: Number, required: true },
		active: { type: Boolean, default: true },
		title: { type: String, required: true },
		producer: { type: String }, // endast för vin
		description: { type: String },
		price: { type: Number },
	},
	{ timestamps: true }
);

// Schema för en hel sektion, t.ex. "VECKANS VINER" eller "SNACKS"
const MenuSectionSchema = new Schema(
	{
		id: { type: String, required: true, unique: true },
		title: { type: String, required: true },
		description: { type: String },
		type: { type: String, required: true },
		price: { type: Schema.Types.Mixed }, // ibland är det en siffra, ibland tomt
		items: [MenuItemSchema],
	},
	{ timestamps: true }
);

function formatSwedishTime(date) {
	const swedishOffset = 60 * 60 * 1000; // +1 timme för vintertid
	const isSummerTime = new Date().getTimezoneOffset() === -120; // +2 timme på sommaren
	const offset = swedishOffset + (isSummerTime ? 60 * 60 * 1000 : 0);

	const localDate = new Date(date.getTime() + offset);
	return localDate.toISOString().split('.')[0];
}

// Anpassad JSON-konvertering för att formatera timestamps
MenuItemSchema.set('toJSON', {
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
MenuSectionSchema.set('toJSON', {
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

const Menu = mongoose.model('Menu', MenuSectionSchema);

export default Menu;
