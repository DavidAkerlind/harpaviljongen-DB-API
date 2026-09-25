// Days as 'YYYY-MM-DD' strings. "Today" is the day in Stockholm, so a visit at
// 00:30 Swedish time counts on the right day.
const stockholm = new Intl.DateTimeFormat('sv-SE', {
	timeZone: 'Europe/Stockholm',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

export const stockholmDay = (date = new Date()) => stockholm.format(date);

export function addDays(day, amount) {
	const date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
}

// Every day from `from` to `to`, both included
export function daysBetween(from, to) {
	const days = [];
	for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
	return days;
}
