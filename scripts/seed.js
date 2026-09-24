// Fills an empty (local/dev) database with the data the admin and website need:
// all seven opening-hour days and the page settings. Never overwrites existing data.
// Usage: npm run seed
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import OpeningHour from '../models/openingHour.js';
import SiteSettings from '../models/siteSettings.js';

dotenv.config();

const DEFAULT_HOURS = {
	Måndag: { from: '', to: '' },
	Tisdag: { from: '', to: '' },
	Onsdag: { from: '', to: '' },
	Torsdag: { from: '17:00', to: '00:00' },
	Fredag: { from: '17:00', to: '00:00' },
	Lördag: { from: '17:00', to: '00:00' },
	Söndag: { from: '', to: '' },
};

await mongoose.connect(process.env.CONNECTION_STRING);
console.log(`Connected to database "${mongoose.connection.name}"`);

const hoursResult = await OpeningHour.bulkWrite(
	Object.entries(DEFAULT_HOURS).map(([day, hours]) => ({
		updateOne: {
			filter: { day },
			update: { $setOnInsert: { day, hours } },
			upsert: true,
		},
	}))
);
console.log(`Opening hours: ${hoursResult.upsertedCount} day(s) added`);

const settingsResult = await SiteSettings.updateOne(
	{ key: 'main' },
	{ $setOnInsert: { key: 'main' } },
	{ upsert: true, setDefaultsOnInsert: true }
);
console.log(
	`Site settings: ${settingsResult.upsertedCount ? 'created' : 'already existed'}`
);

await mongoose.disconnect();
