export function formatSwedishTime(date) {
	const swedishOffset = 60 * 60 * 1000; // +1 timme för vintertid
	const isSummerTime = new Date().getTimezoneOffset() === -120; // +2 timme på sommaren
	const offset = swedishOffset + (isSummerTime ? 60 * 60 * 1000 : 0);

	const localDate = new Date(date.getTime() + offset);
	return localDate.toISOString().split('.')[0];
}
