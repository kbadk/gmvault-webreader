function getUserLanguage() {
	return (navigator.languages && navigator.languages[0])
		|| navigator.userLanguage
		|| navigator.language
		|| navigator.browserLanguage
		|| getUserLanguage();
}

export function formatShortDate(date) {
	// Ensure it's a date. Easier to just recast than check if already a date.
	date = new Date(date);

	if (date.getFullYear() === (new Date()).getFullYear()) {
		return date.toLocaleString(getUserLanguage(),
			{ month: 'short', day: 'numeric' });
	}

	return date.toLocaleDateString(getUserLanguage(),
		{ month: 'numeric', day: 'numeric', year: 'numeric' });
}

export function formatLongDate(date) {
	// Ensure it's a date. Easier to just recast than check if already a date.
	date = new Date(date);

	const localDate = date.toLocaleString(getUserLanguage(),
		{ month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' });
	return `${localDate} (${timeSince(date)} ago)`;

}

export function timeBetween(dateA, dateB) {
	const seconds = Math.floor((dateB - dateA) / 1000);
	let interval = Math.floor(seconds / 31536000);
	if (interval > 2) {
		return interval + ' years';
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 2) {
		return interval + ' months';
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 2) {
		return interval + ' days';
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 2) {
		return interval + ' hours';
	}
	interval = Math.floor(seconds / 60);
	if (interval > 2) {
		return interval + ' minutes';
	}
	return Math.floor(seconds) + ' seconds';
}

export function timeSince(date) {
	return timeBetween(date, new Date());
}