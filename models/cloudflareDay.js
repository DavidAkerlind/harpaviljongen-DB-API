import mongoose from 'mongoose';
import { STAT_RETENTION_DAYS } from './siteStat.js';

// Cloudflare's numbers for one finished day (Stockholm time), saved so they stay after
// Cloudflare stops keeping them (how long depends on the plan) and don't have to be asked
// for again. Only counters, no IP addresses. See services/cloudflareAnalytics.js.
//   views  – page loads of the website's pages by people (bots and data centres left out)
//   visits – those that didn't come from another page on the site
//   pages / devices / countries – page loads per page, device type and country ('SE')

const countSchema = new mongoose.Schema(
	{ key: { type: String, required: true }, views: { type: Number, default: 0 } },
	{ _id: false }
);

const cloudflareDaySchema = new mongoose.Schema(
	{
		day: { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
		// Which version of the filtering counted the day; days counted differently are asked for again
		version: { type: Number, required: true },
		views: { type: Number, default: 0 },
		visits: { type: Number, default: 0 },
		pages: { type: [countSchema], default: [] },
		devices: { type: [countSchema], default: [] },
		countries: { type: [countSchema], default: [] },
		createdAt: {
			type: Date,
			default: Date.now,
			expires: STAT_RETENTION_DAYS * 24 * 60 * 60,
		},
	},
	{ versionKey: false, collection: 'cloudflaredays' }
);

const CloudflareDay = mongoose.model('CloudflareDay', cloudflareDaySchema);

export default CloudflareDay;
