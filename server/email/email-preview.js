const emailRead = require('./email-read');
const { relative } = require('path');

// Length of each email text snippet when requesting an email listing.
const SNIPPET_LENGTH = 300;

async function previewer(rootPath, emails) {
	for (let i = 0; i < emails.length; ++i) {
		const { from, date, subject, text } = await emailRead(emails[i]);
		emails[i] = {
			path: relative(rootPath, emails[i]),
			from: from && from.value,
			date,
			subject,
			snippet: text && text.substring(0, SNIPPET_LENGTH).replace(/\n/g, ' ')
		};
	}

	return emails;
}

module.exports = previewer;