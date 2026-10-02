const emailRead = require('./email-read');
const { attachmentGroups } = require('./email-attachments');
const { relative } = require('path');

// Length of each email text snippet when requesting an email listing.
const SNIPPET_LENGTH = 300;

async function previewer(rootPath, emails) {
	for (let i = 0; i < emails.length; ++i) {
		const email = await emailRead(emails[i]);
		const { from, date, subject, text } = email;
		emails[i] = {
			path: relative(rootPath, emails[i]),
			from: from && from.value,
			date,
			subject,
			// Only names and types for the attachment icon's tooltip, largest first. Embedded and unused inline images
			// don't count.
			attachments: attachmentGroups(email)
				.map((group, index) => group === 'attachment' && email.attachments[index])
				.filter(Boolean)
				.sort((a, b) => b.size - a.size)
				.map(({ filename, contentType }) => ({ filename, contentType })),
			snippet: text && text.substring(0, SNIPPET_LENGTH).replace(/\n/g, ' ')
		};
	}

	return emails;
}

module.exports = previewer;