import NewsletterDay from '../models/newsletterDay.js';
import { getGetanewsletterData } from './getanewsletterApi.js';
import { ANALYTICS_RANGES } from './analyticsService.js';
import { addDays, daysBetween, stockholmDay } from '../utils/days.js';

// The newsletter's signups go to the restaurant's account at Get a Newsletter
// (getanewsletter.com). A subscription form made there has a link, e.g.
// https://gansub.com/s/AbC123/, set as GETANEWSLETTER_FORM_LINK. Posting an email address
// to it with "Accept: application/json" adds the address to the form's list (and Get a
// Newsletter sends its confirmation email if the form has one); 201 means it went through.
// The same as Get a Newsletter's own WordPress plugin does. No address is stored here, only
// how many signed up per day (models/newsletterDay.js) for the admin's statistics.
const TIMEOUT_MS = 10000;

// Loose on purpose: Get a Newsletter checks the address itself
export const isEmail = (value) =>
	typeof value === 'string' &&
	value.length <= 254 &&
	/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export const newsletterConnected = () => Boolean(process.env.GETANEWSLETTER_FORM_LINK);

const failure = (status, message) => Object.assign(new Error(message), { status });

export async function subscribeToNewsletter(email) {
	const formLink = process.env.GETANEWSLETTER_FORM_LINK;
	if (!formLink) throw failure(503, 'The newsletter is not connected yet');

	let res;
	try {
		res = await fetch(formLink, {
			method: 'POST',
			headers: { Accept: 'application/json' },
			// gan_repeat_email: Get a Newsletter's trap for bots, always empty
			body: new URLSearchParams({ email, first_name: '', last_name: '', gan_repeat_email: '' }),
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (error) {
		console.error('[newsletter] Get a Newsletter did not answer:', error.message);
		throw failure(502, 'Could not reach Get a Newsletter');
	}

	if (res.ok) return;
	const detail = (await res.text().catch(() => '')).slice(0, 300);
	console.error(`[newsletter] Get a Newsletter answered ${res.status}: ${detail}`);
	if (res.status === 400) throw failure(400, 'Get a Newsletter did not accept the address');
	throw failure(502, 'Get a Newsletter could not add the address');
}

// One more signup through the website's field today
export async function recordSignup(now = new Date()) {
	await NewsletterDay.updateOne(
		{ day: stockholmDay(now) },
		{ $inc: { signups: 1 }, $setOnInsert: { createdAt: now } },
		{ upsert: true }
	);
}

const countByDay = (days) => {
	const map = new Map();
	for (const day of days) if (day) map.set(day, (map.get(day) ?? 0) + 1);
	return map;
};
const sumBetween = (map, from, to) => {
	let sum = 0;
	for (const [day, n] of map) if (day >= from && day <= to) sum += n;
	return sum;
};

// Everything the admin's Statistik page shows about the newsletter for a period:
// signups through the website's field (our own counting) and, when GETANEWSLETTER_API_TOKEN
// is set, Get a Newsletter's numbers for every way in (the popup too).
export async function getNewsletterStats(rangeKey, now = new Date()) {
	const length = ANALYTICS_RANGES[rangeKey];
	const to = stockholmDay(now);
	const from = addDays(to, -(length - 1));
	const previousTo = addDays(from, -1);
	const previousFrom = addDays(previousTo, -(length - 1));

	const [ownDays, firstOwn, gan] = await Promise.all([
		NewsletterDay.find({ day: { $gte: previousFrom, $lte: to } }).lean(),
		NewsletterDay.findOne().sort({ day: 1 }).select('day').lean(),
		getGetanewsletterData(),
	]);

	const own = new Map(ownDays.map((d) => [d.day, d.signups]));
	const ownSince = firstOwn?.day ?? null;

	let getanewsletter = { status: gan.status };
	let added = null;
	let cancelled = null;
	if (gan.status === 'error') getanewsletter.message = gan.message;
	if (gan.status === 'ok') {
		const counted = gan.lists.every((list) => list.subscribers !== null);
		const active = gan.subscriptions?.filter((s) => !s.cancelled).length ?? null;
		if (gan.subscriptions) {
			added = countByDay(gan.subscriptions.map((s) => s.created));
			cancelled = countByDay(gan.subscriptions.map((s) => s.cancelled));
		}
		getanewsletter = {
			status: 'ok',
			// Active subscribers now, on every list together
			subscribers: counted
				? gan.lists.reduce((sum, list) => sum + list.subscribers, 0)
				: active,
			lists: gan.lists.map(({ name, subscribers }) => ({ name, subscribers })),
			// Lists not counted: Get a Newsletter's "Test list" (or those not in GETANEWSLETTER_LISTS)
			skippedLists: gan.skippedLists,
			// Subscriptions started and ended in the period and the one before; null when the
			// lists are too big to go through
			growth: added && {
				added: sumBetween(added, from, to),
				cancelled: sumBetween(cancelled, from, to),
				previousAdded: sumBetween(added, previousFrom, previousTo),
				previousCancelled: sumBetween(cancelled, previousFrom, previousTo),
			},
			newsletters: gan.newsletters,
		};
	}

	return {
		range: { key: rangeKey, from, to, days: length },
		series: daysBetween(from, to).map((date) => ({
			date,
			website: own.get(date) ?? 0,
			added: added ? (added.get(date) ?? 0) : null,
			cancelled: cancelled ? (cancelled.get(date) ?? 0) : null,
		})),
		website: {
			since: ownSince,
			total: sumBetween(own, from, to),
			// Compared only when our counting had started before the period before
			previous:
				ownSince && ownSince <= previousFrom ? sumBetween(own, previousFrom, previousTo) : null,
		},
		getanewsletter,
	};
}
