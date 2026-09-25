import mongoose from 'mongoose';

// Our own visitor statistics for the website, counted per day (Stockholm time) –
// no cookies, no IP addresses, nothing that identifies a visitor is saved.
// One document per day and thing counted:
//   kind 'total'    key ''                   – the whole site
//   kind 'page'     key '/events'            – a page
//   kind 'referrer' key 'google.com'         – where a visit came from, '(direct)' when unknown
//   kind 'device'   key 'mobile'             – mobile, tablet or desktop
// views = page views. visits = page views that did not come from another page on the
// site (the same definition as Cloudflare's, so the two can be compared).

export const STAT_KINDS = ['total', 'page', 'referrer', 'device'];
export const STAT_RETENTION_DAYS = 400; // a bit over a year, so a year can be compared

const siteStatSchema = new mongoose.Schema(
	{
		day: { type: String, required: true }, // 'YYYY-MM-DD'
		kind: { type: String, enum: STAT_KINDS, required: true },
		key: { type: String, default: '' },
		views: { type: Number, default: 0 },
		visits: { type: Number, default: 0 },
		createdAt: {
			type: Date,
			default: Date.now,
			expires: STAT_RETENTION_DAYS * 24 * 60 * 60,
		},
	},
	{ versionKey: false, collection: 'sitestats' }
);

siteStatSchema.index({ day: 1, kind: 1, key: 1 }, { unique: true });
siteStatSchema.index({ kind: 1, day: 1 });

const SiteStat = mongoose.model('SiteStat', siteStatSchema);

export default SiteStat;
