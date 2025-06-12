import mongoose from 'mongoose';
import { formatSwedishTime } from '../utils/formatSwedishTime.js';

const Schema = mongoose.Schema;

// Vinobjekt
const WineItemSchema = new Schema(
	{
		id: { type: String },
		active: { type: Boolean, required: true, default: true },
		name: { type: String, required: true, unique: true },
		price: { type: Schema.Types.Mixed },
	},
	{ timestamps: true }
);

// Områden inom ett land
const AreaSchema = new Schema(
	{
		area: { type: String, unique: true },
		items: [WineItemSchema],
	},
	{ _id: false }
);

// Länder i vinlistan
const CountrySchema = new Schema(
	{
		country: { type: String, required: true, unique: true }, // T.ex. "Italien"
		areas: [AreaSchema],
	},
	{ _id: false }
);

// Hela vinlistan/bladet
const WineListSchema = new Schema(
	{
		id: { type: String, required: true, unique: true },
		title: { type: String, required: true }, // T.ex. "Rött"
		countries: {
			type: Map,
			of: CountrySchema,
			default: {},
		},
	},
	{ timestamps: true }
);

// Anpassad JSON-konvertering för timestamps
WineItemSchema.set('toJSON', {
	transform: (doc, ret) => {
		if (ret.createdAt)
			ret.createdAt = formatSwedishTime(new Date(ret.createdAt));
		if (ret.updatedAt)
			ret.updatedAt = formatSwedishTime(new Date(ret.updatedAt));
		return ret;
	},
});
WineListSchema.set('toJSON', {
	transform: (doc, ret) => {
		if (ret.createdAt)
			ret.createdAt = formatSwedishTime(new Date(ret.createdAt));
		if (ret.updatedAt)
			ret.updatedAt = formatSwedishTime(new Date(ret.updatedAt));
		return ret;
	},
});

const WineList = mongoose.model('WineList', WineListSchema);

export default WineList;
