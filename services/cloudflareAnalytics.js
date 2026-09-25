import CloudflareDay from '../models/cloudflareDay.js';
import { addDays, daysBetween, stockholmDay, stockholmStart } from '../utils/days.js';
import { deviceType, isBot } from '../utils/userAgent.js';

// Cloudflare's traffic data for the website (what Cloudflare's Traffic overview shows),
// read through its GraphQL API and cleaned down to page loads by people:
//   - only harpaviljongen.com and www.harpaviljongen.com, not the admin or *.pages.dev
//   - only the website's pages, not images, scripts, robots.txt or the made-up addresses
//     scanners try (the website answers those with its start page)
//   - only answers 200 and 304, not redirects or errors
//   - no bots or scripts (by user agent) and nothing from data centres such as Google Cloud,
//     Azure and AWS, where the scanners that pretend to be browsers come from
// Cloudflare only sees a page being loaded from the server. Moving between pages on the
// website happens in the browser, so Cloudflare's page views are fewer than our own.
// Nothing about a visitor is kept: finished days are saved as counters (models/cloudflareDay.js).
//
// Optional: without the first two variables the admin only shows our own statistics.
//   CLOUDFLARE_API_TOKEN   – token with "Account Analytics: Read"
//   CLOUDFLARE_ACCOUNT_ID  – the Cloudflare account id
//   CLOUDFLARE_ZONE_ID     – optional: read the zone instead of the whole account
//                            (the token then needs "Zone · Analytics · Read")
//   CLOUDFLARE_SITE_HOSTS  – optional, the website's hostnames, comma separated
//                            (default harpaviljongen.com,www.harpaviljongen.com)
// See docs/GO_LIVE.md for where to find them.

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const MINUTE = 60 * 1000;
const DAY_SECONDS = 24 * 60 * 60;
const CACHE_MS = 10 * MINUTE; // today's numbers
const ERROR_CACHE_MS = MINUTE;
// A day is saved once Cloudflare has had an hour to finish counting it
const SETTLE_MS = 60 * MINUTE;
const PARALLEL = 4;
// Used when Cloudflare doesn't tell us its limits: small enough to be allowed on any plan
const DEFAULT_LIMITS = { maxDuration: DAY_SECONDS, notOlderThan: 7 * DAY_SECONDS, maxPageSize: 1000 };

// Change when the counting below changes: saved days counted the old way are asked for again
// (as far back as Cloudflare still has them)
const VERSION = 1;

const DEFAULT_HOSTS = 'harpaviljongen.com,www.harpaviljongen.com';

// The website's pages (src/App.jsx in the website). Add new pages here.
const PAGES = ['/', '/menu', '/wine-list', '/chambre', '/events', '/gallery'];
const PAGE_PATTERNS = ['/event/%']; // one event
const PATHS = [...PAGES, ...PAGES.filter((p) => p !== '/').map((p) => `${p}/`)];

// Networks of data centres and cloud providers (AS numbers). People don't browse from these,
// the scanners in Cloudflare's traffic data do.
const DATA_CENTRES = new Set([
	'16509', '14618', '8987', // Amazon AWS
	'8075', // Microsoft Azure
	'15169', '396982', '19527', // Google, Google Cloud
	'14061', // DigitalOcean
	'16276', // OVH
	'24940', '213230', '212317', // Hetzner
	'63949', // Linode
	'20473', // Vultr
	'45102', '37963', // Alibaba Cloud
	'132203', '45090', // Tencent Cloud
	'135377', // UCloud
	'55990', '136907', // Huawei Cloud
	'31898', // Oracle Cloud
	'51167', // Contabo
	'12876', // Scaleway
	'60781', '28753', // Leaseweb
	'36352', // ColoCrossing
	'47583', // Hostinger
	'197540', // netcup
	'49981', // WorldStream
	'202425', // IP Volume
	'48090', // Techoff
	'211298', // Driftnet
	'398324', '398705', '398722', // Censys
]);

// What each page load is grouped by. Only the path is needed; the rest is left out if the
// plan doesn't allow it (then bots, data centres, devices or countries can't be told apart).
const DIMENSIONS = ['clientRequestPath', 'userAgent', 'clientCountryName', 'clientAsn'];

const config = () => ({
	token: process.env.CLOUDFLARE_API_TOKEN?.trim(),
	accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),
	zoneId: process.env.CLOUDFLARE_ZONE_ID?.trim(),
	hosts: (process.env.CLOUDFLARE_SITE_HOSTS || DEFAULT_HOSTS)
		.split(',')
		.map((host) => host.trim().toLowerCase())
		.filter(Boolean),
});

export const isCloudflareConfigured = () => {
	const { token, accountId, zoneId } = config();
	return Boolean(token && (accountId || zoneId));
};

const quote = JSON.stringify;

// The whole account, or only the zone when CLOUDFLARE_ZONE_ID is set
function scope() {
	const { accountId, zoneId } = config();
	return zoneId
		? { field: 'zones', query: `zones(filter: { zoneTag: ${quote(zoneId)} })` }
		: { field: 'accounts', query: `accounts(filter: { accountTag: ${quote(accountId)} })` };
}

async function graphql(body) {
	const { field, query } = scope();
	const res = await fetch(GRAPHQL_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config().token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ query: `{ viewer { ${query} { ${body} } } }` }),
		signal: AbortSignal.timeout(15000),
	});
	const json = await res.json().catch(() => null);
	const error = json?.errors?.[0]?.message;
	if (!res.ok || error) {
		throw new Error(error || `Cloudflare answered ${res.status}`);
	}
	const found = json?.data?.viewer?.[field]?.[0];
	if (!found) {
		throw new Error(
			field === 'zones'
				? 'Cloudflare found no zone with that CLOUDFLARE_ZONE_ID'
				: 'Cloudflare found no account with that CLOUDFLARE_ACCOUNT_ID'
		);
	}
	return found;
}

// How long a period one query may cover, how far back data is kept, how many rows one
// query returns and which fields this plan may ask for
let limits = null;
async function getLimits() {
	if (limits && Date.now() - limits.at < DAY_SECONDS * 1000) return limits;
	let found = null;
	try {
		const result = await graphql(`settings { httpRequestsAdaptiveGroups {
			enabled maxDuration notOlderThan maxPageSize availableFields
		} }`);
		found = result?.settings?.httpRequestsAdaptiveGroups;
	} catch (error) {
		console.log('Cloudflare settings:', error.message);
	}
	if (found?.enabled === false) {
		throw new Error('Cloudflare traffic data (httpRequestsAdaptiveGroups) is not enabled for this account');
	}
	// availableFields names nested fields like 'sum_visits'; an empty list means we don't know
	const fields = Array.isArray(found?.availableFields) ? found.availableFields : [];
	const canAsk = (name) =>
		!fields.length || fields.some((field) => field.split(/[._]/).includes(name));
	const dimensions = DIMENSIONS.filter((name, i) => i === 0 || canAsk(name));
	const skipped = DIMENSIONS.filter((name) => !dimensions.includes(name));
	if (skipped.length) {
		console.log(`Cloudflare: the plan doesn't allow ${skipped.join(', ')}; counting without`);
	}
	limits = {
		maxDuration: found?.maxDuration || DEFAULT_LIMITS.maxDuration,
		notOlderThan: found?.notOlderThan || DEFAULT_LIMITS.notOlderThan,
		maxPageSize: Math.min(found?.maxPageSize || DEFAULT_LIMITS.maxPageSize, 10000),
		dimensions,
		at: Date.now(),
	};
	return limits;
}

// One query: the page loads from start to end grouped by page, browser, country and network
async function queryRows(start, end, { maxPageSize, dimensions }) {
	const { hosts } = config();
	const filter = `{ AND: [
		{ datetime_geq: ${quote(start.toISOString())}, datetime_lt: ${quote(end.toISOString())} },
		{ requestSource: "eyeball" },
		{ clientRequestHTTPHost_in: ${quote(hosts)} },
		{ edgeResponseStatus_in: [200, 304] },
		{ OR: [
			{ clientRequestPath_in: ${quote(PATHS)} },
			${PAGE_PATTERNS.map((p) => `{ clientRequestPath_like: ${quote(p)} }`).join(', ')}
		] }
	] }`;
	const result = await graphql(`rows: httpRequestsAdaptiveGroups(
		filter: ${filter}, limit: ${maxPageSize}, orderBy: [count_DESC]
	) { count sum { visits } dimensions { ${dimensions.join(' ')} } }`);
	return result.rows ?? [];
}

const add = (map, key, amount) => map.set(key, (map.get(key) ?? 0) + (amount ?? 0));

export const normalizePath = (path) =>
	path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;

// Rows -> the day's counters, without bots and data centres
export function countRows(rows) {
	const day = { views: 0, visits: 0, pages: new Map(), devices: new Map(), countries: new Map() };
	for (const { count, sum, dimensions: d = {} } of rows) {
		if (d.userAgent !== undefined && isBot(d.userAgent)) continue;
		if (d.clientAsn !== undefined && DATA_CENTRES.has(String(d.clientAsn))) continue;
		const views = count ?? 0;
		day.views += views;
		day.visits += sum?.visits ?? 0;
		add(day.pages, normalizePath(d.clientRequestPath || '/'), views);
		if (d.userAgent !== undefined) add(day.devices, deviceType(d.userAgent), views);
		if (d.clientCountryName) add(day.countries, d.clientCountryName, views);
	}
	return day;
}

// One Stockholm day, in as many queries as Cloudflare's longest allowed period needs
async function fetchDay(day, limits) {
	const start = stockholmStart(day);
	const dayEnd = stockholmStart(addDays(day, 1));
	const end = new Date(Math.min(dayEnd.getTime(), Date.now()));
	const rows = [];
	for (let s = start; s < end; ) {
		const e = new Date(Math.min(s.getTime() + limits.maxDuration * 1000, end.getTime()));
		rows.push(...(await queryRows(s, e, limits)));
		s = e;
	}
	const counts = countRows(rows);
	if (dayEnd.getTime() + SETTLE_MS < Date.now()) {
		await CloudflareDay.updateOne(
			{ day },
			{
				$set: { version: VERSION, views: counts.views, visits: counts.visits, ...listsOf(counts) },
				$setOnInsert: { createdAt: new Date() },
			},
			{ upsert: true }
		);
	}
	return counts;
}

const toList = (map) => [...map].map(([key, views]) => ({ key, views }));
const toMap = (list = []) => new Map(list.map(({ key, views }) => [key, views]));
const listsOf = (counts) => ({
	pages: toList(counts.pages),
	devices: toList(counts.devices),
	countries: toList(counts.countries),
});

// Unfinished days for a few minutes, and the same day asked for twice at once only once
const recent = new Map(); // day -> { at, promise }
function dayOnce(day, limits) {
	const hit = recent.get(day);
	if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
	const promise = fetchDay(day, limits);
	recent.set(day, { at: Date.now(), promise });
	promise.catch(() => recent.delete(day));
	for (const [key, entry] of recent) {
		if (Date.now() - entry.at > CACHE_MS) recent.delete(key);
	}
	return promise;
}

// A few at a time: Cloudflare allows about one query per second on average
async function eachLimited(items, fn) {
	const results = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
	return results;
}

let lastError = null;

// Page views and visits per day (Stockholm days) and the pages, devices and countries
// from `from` to `to` ('YYYY-MM-DD', both included). Days Cloudflare no longer has and we
// didn't save are left out.
// Returns { status: 'ok', since, days: Map, pages: Map, devices: Map, countries: Map },
// { status: 'off' } or { status: 'error', message }.
export async function getCloudflareStats(from, to) {
	if (!isCloudflareConfigured()) return { status: 'off' };
	if (lastError && Date.now() - lastError.at < ERROR_CACHE_MS) {
		return { status: 'error', message: lastError.message };
	}

	try {
		const limits = await getLimits();
		const now = Date.now();
		// The first whole day Cloudflare still has
		const oldest = now - (limits.notOlderThan - 60) * 1000;
		let firstAvailable = stockholmDay(new Date(oldest));
		if (stockholmStart(firstAvailable).getTime() < oldest) {
			firstAvailable = addDays(firstAvailable, 1);
		}

		const range = daysBetween(from, to);
		const [saved, firstSaved] = await Promise.all([
			CloudflareDay.find({ day: { $in: range }, version: VERSION }).lean(),
			CloudflareDay.findOne({ version: VERSION }).sort({ day: 1 }).select('day').lean(),
		]);
		const byDay = new Map(
			saved.map((d) => [
				d.day,
				{
					views: d.views,
					visits: d.visits,
					pages: toMap(d.pages),
					devices: toMap(d.devices),
					countries: toMap(d.countries),
				},
			])
		);
		const missing = range.filter(
			(day) => !byDay.has(day) && day >= firstAvailable && stockholmStart(day).getTime() < now
		);
		const fetched = await eachLimited(missing, (day) => dayOnce(day, limits));
		missing.forEach((day, i) => byDay.set(day, fetched[i]));

		const days = new Map();
		const pages = new Map();
		const devices = new Map();
		const countries = new Map();
		for (const day of range) {
			const counts = byDay.get(day);
			if (!counts) continue;
			days.set(day, { views: counts.views, visits: counts.visits });
			for (const [key, n] of counts.pages) add(pages, key, n);
			for (const [key, n] of counts.devices) add(devices, key, n);
			for (const [key, n] of counts.countries) add(countries, key, n);
		}
		lastError = null;
		const since =
			firstSaved?.day && firstSaved.day < firstAvailable ? firstSaved.day : firstAvailable;
		return { status: 'ok', since, days, pages, devices, countries };
	} catch (error) {
		console.log('Cloudflare:', error.message);
		lastError = { at: Date.now(), message: error.message };
		return { status: 'error', message: error.message };
	}
}
