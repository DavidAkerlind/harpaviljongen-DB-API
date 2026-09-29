import { stockholmDay } from '../utils/days.js';

// Get a Newsletter's API (https://api.getanewsletter.com/v3/), for the admin's statistics:
// how many subscribe to the newsletter, when they signed up or left, and the newsletters
// that were sent. Read with an API key made in Get a Newsletter under My Account → API,
// set as GETANEWSLETTER_API_TOKEN. Only reads; nothing is saved, and the email addresses
// in the answers are dropped straight away. Answers are kept in memory for a few minutes.
// Same requests as Get a Newsletter's own WordPress plugin (GAPI.class.php).

const DEFAULT_URL = 'https://api.getanewsletter.com/v3/';
const TIMEOUT_MS = 15000;
const PAGE_SIZE = 100;
// 5 000 subscriptions per list. A bigger list is only shown as a total, not per day.
const MAX_SUBSCRIBER_PAGES = 50;
const NEWSLETTERS_SHOWN = 6;
const CACHE_MS = 5 * 60 * 1000;
const ERROR_CACHE_MS = 60 * 1000;

export const isGetanewsletterApiConfigured = () =>
	Boolean(process.env.GETANEWSLETTER_API_TOKEN);

// GETANEWSLETTER_API_URL is only for testing against something else than the real API
const baseUrl = () => new URL(process.env.GETANEWSLETTER_API_URL || DEFAULT_URL);

async function get(pathOrUrl) {
	const base = baseUrl();
	const url = new URL(pathOrUrl, base);
	// The key only goes to Get a Newsletter. The "next page" links come from their answers,
	// sometimes as http://, so they are sent the same way as everything else.
	if (url.hostname !== base.hostname) {
		throw new Error(`Get a Newsletter linked to another address (${url.hostname})`);
	}
	url.protocol = base.protocol;
	url.port = base.port;

	let res;
	try {
		res = await fetch(url, {
			headers: {
				Accept: 'application/json',
				Authorization: `Token ${process.env.GETANEWSLETTER_API_TOKEN}`,
			},
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (error) {
		throw new Error(`Could not reach Get a Newsletter (${error.message})`);
	}
	if (res.status === 401 || res.status === 403) {
		throw new Error(`Get a Newsletter did not accept GETANEWSLETTER_API_TOKEN (${res.status})`);
	}
	if (!res.ok) throw new Error(`Get a Newsletter answered ${res.status} for ${url.pathname}`);
	const json = await res.json().catch(() => null);
	if (!json) throw new Error(`Get a Newsletter did not answer with JSON for ${url.pathname}`);
	return json;
}

// Every item of a paged list ({ count, next, results }); null when there are more than maxPages
async function getAll(path, maxPages) {
	const items = [];
	let next = path;
	for (let page = 0; next; page++) {
		if (page >= maxPages) return null;
		const json = await get(next);
		const results = Array.isArray(json) ? json : json.results;
		if (!Array.isArray(results)) {
			throw new Error(`Unexpected answer from Get a Newsletter for ${path}`);
		}
		items.push(...results);
		next = Array.isArray(json) ? null : json.next;
	}
	return items;
}

const toNumber = (value) => {
	const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

// '2026-09-29T14:03:11+02:00' -> '2026-09-29' in Stockholm, null for no date
const toDay = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : stockholmDay(date);
};

// When each subscription started and ended, per day. Only the dates are kept.
async function loadSubscriptions(lists) {
	const perList = await Promise.all(
		lists.map((list) =>
			getAll(
				`lists/${encodeURIComponent(list.hash)}/subscribers/?paginate_by=${PAGE_SIZE}`,
				MAX_SUBSCRIBER_PAGES
			)
		)
	);
	if (perList.some((items) => items === null)) return null;
	return perList.flat().map((item) => ({
		created: toDay(item.created ?? item.subscription_created),
		cancelled: toDay(item.cancelled ?? item.subscription_cancelled),
	}));
}

// The latest newsletters sent, newest first
async function loadNewsletters() {
	const json = await get(`reports/?ordering=-sent&paginate_by=${PAGE_SIZE}`);
	const reports = Array.isArray(json) ? json : (json.results ?? []);
	return reports
		.filter((report) => report.sent)
		.sort((a, b) => new Date(b.sent) - new Date(a.sent))
		.slice(0, NEWSLETTERS_SHOWN)
		.map((report) => ({
			id: String(report.id ?? report.url ?? report.sent),
			subject: report.mail_subject || report.subject || report.name || '',
			sent: new Date(report.sent).toISOString(),
			recipients: toNumber(report.sent_to),
			// Unique opens and clicks when Get a Newsletter sends them, otherwise every open
			uniqueOpens: toNumber(report.unique_html_opened),
			opens: toNumber(report.total_html_opened),
			uniqueClicks: toNumber(report.unique_link_clicks),
		}));
}

// Every account has Get a Newsletter's "Test list" (for sending a newsletter to yourself
// before it goes out), which isn't subscribers, so it isn't counted. GETANEWSLETTER_LISTS
// (list hashes, comma separated) picks the lists to count instead.
const isTestList = (list) =>
	/^test ?lista?$/i.test(list.name?.trim() ?? '') ||
	/newsletter tests|testutskick/i.test(list.description ?? '');

function chooseLists(all) {
	const wanted = (process.env.GETANEWSLETTER_LISTS || '')
		.split(',')
		.map((hash) => hash.trim())
		.filter(Boolean);
	let counted;
	if (wanted.length) {
		counted = all.filter((list) => wanted.includes(list.hash));
		if (!counted.length) throw new Error('No list in Get a Newsletter matches GETANEWSLETTER_LISTS');
	} else {
		const real = all.filter((list) => !isTestList(list));
		counted = real.length ? real : all;
	}
	return { counted, skipped: all.filter((list) => !counted.includes(list)) };
}

async function load() {
	const all = await getAll(`lists/?paginate_by=${PAGE_SIZE}`, 5);
	const { counted, skipped } = chooseLists(all);
	const lists = counted.map((list) => ({
		name: list.name || list.hash,
		hash: list.hash,
		subscribers: toNumber(list.active_subscribers_count),
	}));

	// Per day and the newsletters are extras: without them the totals still show
	const [subscriptions, newsletters] = await Promise.all([
		loadSubscriptions(lists).catch((error) => {
			console.error('[newsletter] Get a Newsletter subscribers:', error.message);
			return null;
		}),
		loadNewsletters().catch((error) => {
			console.error('[newsletter] Get a Newsletter reports:', error.message);
			return null;
		}),
	]);
	return {
		lists,
		skippedLists: skipped.map((list) => list.name || list.hash),
		subscriptions,
		newsletters,
	};
}

let cache = null;

// { status: 'ok', lists, skippedLists, subscriptions, newsletters }, { status: 'off' } or
// { status: 'error', message }. subscriptions is null when a list is too big to count per
// day, newsletters null when they couldn't be read.
export async function getGetanewsletterData({ fresh = false } = {}) {
	if (!isGetanewsletterApiConfigured()) return { status: 'off' };
	const maxAge = cache?.error ? ERROR_CACHE_MS : CACHE_MS;
	if (!fresh && cache && Date.now() - cache.at < maxAge) return cache.promise;

	const entry = { at: Date.now(), error: false };
	entry.promise = load()
		.then((data) => ({ status: 'ok', ...data }))
		.catch((error) => {
			console.error('[newsletter] Get a Newsletter statistics:', error.message);
			entry.error = true;
			return { status: 'error', message: error.message };
		});
	cache = entry;
	return entry.promise;
}
