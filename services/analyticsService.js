import SiteStat from '../models/siteStat.js';
import { getCloudflareStats, normalizePath } from './cloudflareAnalytics.js';
import { addDays, daysBetween, stockholmDay } from '../utils/days.js';

export const ANALYTICS_RANGES = { '7d': 7, '30d': 30, '90d': 90 };
const TOP = 8;

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch/i;
const PATH = /^\/[\w\-./~%]*$/;
const MAX_PATH = 120;

export const isBot = (userAgent = '') => !userAgent || BOT.test(userAgent);

export function deviceType(userAgent = '') {
	if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet';
	if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(userAgent)) return 'mobile';
	return 'desktop';
}

const hostOf = (url) => {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
};

// Checks what the website sends and returns what to count, or null to ignore it.
// { path, referrer, origin, userAgent } -> { path, device, visit, source }
export function readHit({ path, referrer, origin, userAgent }) {
	if (typeof path !== 'string' || isBot(userAgent)) return null;
	const clean = normalizePath(path.split(/[?#]/)[0]);
	if (!clean || clean.length > MAX_PATH || !PATH.test(clean)) return null;

	const siteHost = hostOf(origin);
	const fromHost =
		typeof referrer === 'string' && referrer.length <= 2000 ? hostOf(referrer).slice(0, 100) : '';
	// Coming from another page on the site is a page view, not a new visit
	const internal = Boolean(fromHost) && fromHost === siteHost;
	return {
		path: clean,
		device: deviceType(userAgent),
		visit: !internal,
		source: internal ? null : fromHost || '(direct)',
	};
}

// At most this many different pages / referrers are kept per day; the rest count as
// '(other)'. Stops made-up paths or referrers (the endpoint is public) from filling the database.
const MAX_KEYS_PER_DAY = { page: 60, referrer: 100 };
export const OTHER = '(other)';

async function keyFor(day, kind, key) {
	if (!key || (await SiteStat.exists({ day, kind, key }))) return key;
	const count = await SiteStat.countDocuments({ day, kind });
	return count >= MAX_KEYS_PER_DAY[kind] ? OTHER : key;
}

export async function recordHit({ path, device, visit, source }, now = new Date()) {
	const day = stockholmDay(now);
	[path, source] = await Promise.all([
		keyFor(day, 'page', path),
		keyFor(day, 'referrer', source),
	]);
	const count = (kind, key, inc) => ({
		updateOne: {
			filter: { day, kind, key },
			update: { $inc: inc, $setOnInsert: { createdAt: now } },
			upsert: true,
		},
	});
	const inc = { views: 1, visits: visit ? 1 : 0 };
	const ops = [
		count('total', '', inc),
		count('page', path, inc),
		count('device', device, inc),
	];
	if (source) ops.push(count('referrer', source, { views: 1, visits: 1 }));
	await SiteStat.bulkWrite(ops, { ordered: false });
}

async function ownTotals(from, to) {
	const [row] = await SiteStat.aggregate([
		{ $match: { kind: 'total', day: { $gte: from, $lte: to } } },
		{ $group: { _id: null, views: { $sum: '$views' }, visits: { $sum: '$visits' } } },
	]);
	return { views: row?.views ?? 0, visits: row?.visits ?? 0 };
}

async function ownBreakdown(from, to) {
	const rows = await SiteStat.aggregate([
		{ $match: { kind: { $in: ['page', 'referrer', 'device'] }, day: { $gte: from, $lte: to } } },
		{
			$group: {
				_id: { kind: '$kind', key: '$key' },
				views: { $sum: '$views' },
				visits: { $sum: '$visits' },
			},
		},
	]);
	const maps = { page: new Map(), referrer: new Map(), device: new Map() };
	for (const row of rows) {
		// Pages and devices are compared by page views, referrers by visits
		const value = row._id.kind === 'referrer' ? row.visits : row.views;
		maps[row._id.kind].set(row._id.key, value);
	}
	return maps;
}

// Both sources side by side, the biggest first: [{ key, own, cloudflare }]
function merge(own, cloudflare, limit = TOP) {
	const keys = new Set([...own.keys(), ...(cloudflare?.keys() ?? [])]);
	return [...keys]
		.map((key) => ({
			key,
			own: own.get(key) ?? 0,
			cloudflare: cloudflare ? (cloudflare.get(key) ?? 0) : null,
		}))
		.sort((a, b) => Math.max(b.own, b.cloudflare ?? 0) - Math.max(a.own, a.cloudflare ?? 0))
		.slice(0, limit);
}

// Everything the Statistik page and the dashboard widgets show for a period
export async function getAnalytics(rangeKey, now = new Date()) {
	const length = ANALYTICS_RANGES[rangeKey];
	const to = stockholmDay(now);
	const from = addDays(to, -(length - 1));
	const previousTo = addDays(from, -1);
	const previousFrom = addDays(previousTo, -(length - 1));

	const [dayRows, totals, previous, breakdown, first, cloudflare] = await Promise.all([
		SiteStat.find({ kind: 'total', day: { $gte: from, $lte: to } }),
		ownTotals(from, to),
		ownTotals(previousFrom, previousTo),
		ownBreakdown(from, to),
		SiteStat.findOne({ kind: 'total' }).sort({ day: 1 }),
		getCloudflareStats(from, to),
	]);

	const ownByDay = new Map(dayRows.map((row) => [row.day, row]));
	const cf = cloudflare.status === 'ok' ? cloudflare : null;
	let cfTotals = null;
	if (cf) {
		cfTotals = { views: 0, visits: 0 };
		for (const day of cf.days.values()) {
			cfTotals.views += day.views;
			cfTotals.visits += day.visits;
		}
	}

	return {
		range: { key: rangeKey, from, to, days: length },
		series: daysBetween(from, to).map((date) => {
			const own = ownByDay.get(date);
			const theirs = cf?.days.get(date);
			return {
				date,
				own: { views: own?.views ?? 0, visits: own?.visits ?? 0 },
				cloudflare: cf ? { views: theirs?.views ?? 0, visits: theirs?.visits ?? 0 } : null,
			};
		}),
		totals: { own: totals, ownPrevious: previous, cloudflare: cfTotals },
		breakdown: {
			pages: merge(breakdown.page, cf?.pages),
			referrers: merge(breakdown.referrer, cf?.referrers),
			devices: merge(breakdown.device, cf?.devices, 5),
		},
		sources: {
			own: { since: first?.day ?? null },
			cloudflare:
				cloudflare.status === 'error'
					? { status: 'error', message: cloudflare.message }
					: { status: cloudflare.status },
		},
	};
}
