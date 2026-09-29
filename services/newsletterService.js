// The newsletter's signups go to the restaurant's account at Get a Newsletter
// (getanewsletter.com). A subscription form made there has a link, e.g.
// https://gansub.com/s/AbC123/, set as GETANEWSLETTER_FORM_LINK. Posting an email address
// to it with "Accept: application/json" adds the address to the form's list (and Get a
// Newsletter sends its confirmation email if the form has one); 201 means it went through.
// The same as Get a Newsletter's own WordPress plugin does. No address is stored here.

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
