import { addDays } from '../utils/days.js';

// Reads Cloudflare Web Analytics for the website through Cloudflare's GraphQL API.
// Optional: without the first two variables the admin only shows our own statistics.
//   CLOUDFLARE_API_TOKEN    – token with "Account Analytics: Read"
//   CLOUDFLARE_ACCOUNT_ID   – the Cloudflare account id
//   CLOUDFLARE_SITE_HOSTS   – optional, the website's hostnames, comma separated
//                             (default harpaviljongen.com,www.harpaviljongen.com)
//   CLOUDFLARE_SITE_TAG     – optional, a Web Analytics site tag to use instead of the hostnames
// See docs/GO_LIVE.md for where to find them.

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const CACHE_MS = 10 * 60 * 1000;
const ERROR_CACHE_MS = 60 * 1000;
const DAY_SECONDS = 24 * 60 * 60;
// Used when Cloudflare doesn't tell us its limits: short enough to be allowed on any plan
const DEFAULT_LIMITS = { maxDuration: 7 * DAY_SECONDS, notOlderThan: 90 * DAY_SECONDS };
// The website's own addresses: navigating between its pages is not a referrer
const SITE_HOST = /(^|\.)harpaviljongen\.(com|pages\.dev)$/;

const DEFAULT_HOSTS = 'harpaviljongen.com,www.harpaviljongen.com';

const config = () => ({
	token: process.env.CLOUDFLARE_API_TOKEN?.trim(),
	accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),
	siteTag: process.env.CLOUDFLARE_SITE_TAG?.trim(),
	hosts: (process.env.CLOUDFLARE_SITE_HOSTS || DEFAULT_HOSTS)
		.split(',')
		.map((host) => host.trim().toLowerCase())
		.filter(Boolean),
});

export const isCloudflareConfigured = () => {
	const { token, accountId } = config();
	return Boolean(token && accountId);
};

// Which page loads are the website's: by site tag when one is set, otherwise by hostname
// (no site tag needed, which Cloudflare doesn't show for sites set up automatically)
function siteFilter() {
	const { siteTag, hosts } = config();
	if (siteTag) return `{ siteTag: ${JSON.stringify(siteTag)} }`;
	return `{ OR: [${hosts.map((host) => `{ requestHost: ${JSON.stringify(host)} }`).join(', ')}] }`;
}

async function graphql(query) {
	const res = await fetch(GRAPHQL_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config().token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ query }),
		signal: AbortSignal.timeout(15000),
	});
	const body = await res.json().catch(() => null);
	const error = body?.errors?.[0]?.message;
	if (!res.ok || error) {
		throw new Error(error || `Cloudflare answered ${res.status}`);
	}
	return body.data.viewer.accounts[0];
}

// How long a period one query may cover and how far back data is kept
let limits = null;
async function getLimits() {
	if (limits && Date.now() - limits.at < DAY_SECONDS * 1000) return limits;
	try {
		const account = await graphql(`{
			viewer { accounts(filter: { accountTag: ${JSON.stringify(config().accountId)} }) {
				settings { rumPageloadEventsAdaptiveGroups { maxDuration notOlderThan } }
			} }
		}`);
		const found = account?.settings?.rumPageloadEventsAdaptiveGroups;
		limits = {
			maxDuration: found?.maxDuration || DEFAULT_LIMITS.maxDuration,
			notOlderThan: found?.notOlderThan || DEFAULT_LIMITS.notOlderThan,
			at: Date.now(),
		};
	} catch {
		limits = { ...DEFAULT_LIMITS, at: Date.now() };
	}
	return limits;
}

// One query per period no longer than maxDuration
async function queryPeriod(start, end) {
	const { accountId } = config();
	const filter = `{ AND: [
		{ datetime_geq: ${JSON.stringify(start.toISOString())}, datetime_lt: ${JSON.stringify(end.toISOString())} },
		${siteFilter()}
	] }`;
	return graphql(`{
		viewer { accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
			days: rumPageloadEventsAdaptiveGroups(filter: ${filter}, limit: 1000) {
				count sum { visits } dimensions { date }
			}
			pages: rumPageloadEventsAdaptiveGroups(filter: ${filter}, limit: 25, orderBy: [count_DESC]) {
				count dimensions { requestPath }
			}
			referrers: rumPageloadEventsAdaptiveGroups(filter: ${filter}, limit: 25, orderBy: [count_DESC]) {
				sum { visits } dimensions { refererHost }
			}
			devices: rumPageloadEventsAdaptiveGroups(filter: ${filter}, limit: 10, orderBy: [count_DESC]) {
				count dimensions { deviceType }
			}
		} }
	}`);
}

const add = (map, key, amount) => map.set(key, (map.get(key) ?? 0) + (amount ?? 0));

export const normalizePath = (path) =>
	path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;

const cache = new Map();
const remember = (key, value, ttl) => {
	for (const [k, entry] of cache) {
		if (Date.now() - entry.at > entry.ttl) cache.delete(k);
	}
	cache.set(key, { at: Date.now(), ttl, value });
};

// Page views and visits per day (UTC days) and the top pages, referrers and devices
// from `from` to `to` ('YYYY-MM-DD', both included).
// Returns { status: 'ok', days: Map, pages: Map, referrers: Map, devices: Map },
// { status: 'off' } or { status: 'error', message }.
export async function getCloudflareStats(from, to) {
	if (!isCloudflareConfigured()) return { status: 'off' };

	const cacheKey = `${from}|${to}`;
	const cached = cache.get(cacheKey);
	if (cached && Date.now() - cached.at < cached.ttl) return cached.value;

	let value;
	try {
		const { maxDuration, notOlderThan } = await getLimits();
		const now = new Date();
		const oldest = new Date(now.getTime() - (notOlderThan - 60) * 1000);
		let start = new Date(`${from}T00:00:00Z`);
		if (start < oldest) start = oldest;
		const endOfRange = new Date(`${addDays(to, 1)}T00:00:00Z`);
		const end = endOfRange < now ? endOfRange : now;

		const periods = [];
		for (let s = start; s < end; ) {
			const e = new Date(Math.min(s.getTime() + maxDuration * 1000, end.getTime()));
			periods.push([s, e]);
			s = e;
		}
		const results = await Promise.all(periods.map(([s, e]) => queryPeriod(s, e)));

		const days = new Map();
		const pages = new Map();
		const referrers = new Map();
		const devices = new Map();
		for (const result of results) {
			for (const row of result.days ?? []) {
				const day = days.get(row.dimensions.date) ?? { views: 0, visits: 0 };
				day.views += row.count ?? 0;
				day.visits += row.sum?.visits ?? 0;
				days.set(row.dimensions.date, day);
			}
			for (const row of result.pages ?? []) {
				add(pages, normalizePath(row.dimensions.requestPath || '/'), row.count);
			}
			for (const row of result.referrers ?? []) {
				const host = (row.dimensions.refererHost || '').replace(/^www\./, '');
				if (SITE_HOST.test(host)) continue;
				add(referrers, host || '(direct)', row.sum?.visits);
			}
			for (const row of result.devices ?? []) {
				add(devices, (row.dimensions.deviceType || 'desktop').toLowerCase(), row.count);
			}
		}
		value = { status: 'ok', days, pages, referrers, devices };
		remember(cacheKey, value, CACHE_MS);
	} catch (error) {
		console.log('Cloudflare Web Analytics:', error.message);
		value = { status: 'error', message: error.message };
		remember(cacheKey, value, ERROR_CACHE_MS);
	}
	return value;
}
