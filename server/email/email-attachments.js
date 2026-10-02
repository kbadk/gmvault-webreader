// Same pattern mailparser uses to find `cid:` links.
const CID_LINK = /\bcid:([^'"\s]{1,256})/g;

/**
 * Sort each attachment of a parsed email (with `keepCidLinks`) into one of the groups shown in the email view:
 * - `embedded`: referenced by a `cid:` link in the HTML.
 * - `unused`: an image in a `multipart/related` part that the HTML doesn't reference. Usually the sender's mail
 *   system attached it and the HTML links a hosted copy instead.
 * - `attachment`: everything else.
 * @return {array} Group name for each attachment, in the same order as `email.attachments`.
 */
function attachmentGroups(email) {
	const cids = new Set();
	for (const [, cid] of (email.html || '').matchAll(CID_LINK)) {
		cids.add(cid);
	}

	return email.attachments.map(attachment => {
		if (attachment.cid && cids.has(attachment.cid)) {
			return 'embedded';
		}
		if (attachment.related && /^image\//.test(attachment.contentType)) {
			return 'unused';
		}
		return 'attachment';
	});
}

module.exports = { attachmentGroups };
