// Tells people from bots and device types apart by the browser's user agent. Used for our
// own counting and to clean Cloudflare's traffic data the same way.

const BOT =
	/bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|okhttp|java\/|httpclient|libwww|scrapy|zgrab|masscan|nmap|censys|nuclei|scanner/i;

// Every real browser, in-app browsers included, says "Gecko" ("like Gecko" in Chrome and
// Safari). Scripts that pretend to be a browser often send a cut-off user agent without it.
const BROWSER = /gecko/i;

export const isBot = (userAgent = '') =>
	!userAgent || BOT.test(userAgent) || !BROWSER.test(userAgent);

export function deviceType(userAgent = '') {
	if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet';
	if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(userAgent)) return 'mobile';
	return 'desktop';
}
