const { attachmentGroups } = require('./email-attachments');

/**
 * Prepare a parsed email for the email view. Each attachment gets its group from email-attachments.js, and attachment
 * contents are left out, as they're served over HTTP by attachment-handler.js. `cid:` links in the HTML are left for
 * the client to resolve, as only it knows the URL the app is served from.
 */
function viewEmail(email) {
	const groups = attachmentGroups(email);

	return {
		...email,
		attachments: email.attachments.map(({ content: _content, ...meta }, index) => ({
			...meta,
			group: groups[index],
		})),
	};
}

module.exports = viewEmail;
