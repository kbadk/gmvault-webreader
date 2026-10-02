const { emailGet } = require('./cached-email');
const config = require('../config.js');

// Types the browser may display directly. Everything else is served as a download, so that e.g. an
// HTML or SVG attachment can't run scripts on this origin.
const INLINE_TYPES = [
	'application/pdf',
	'image/gif',
	'image/jpeg',
	'image/png',
	'image/webp',
	'text/plain',
];

// Text parts that browsers would download instead of displaying, e.g. the original headers and status report
// attached to a bounce. These are served as `text/plain`.
const PLAIN_TEXT_TYPES = [
	'message/delivery-status',
	'text/rfc822-headers',
];

module.exports = async (req, res) => {
	const { dir, file } = req.params;
	const index = Number(req.params.index);

	let email;
	try {
		email = await emailGet(config.mailRoot, `${dir}/${file}`);
	} catch (e) {
		return res.sendStatus(404);
	}

	const attachment = Number.isInteger(index) && email.attachments[index];
	if (!attachment) {
		return res.sendStatus(404);
	}

	const contentType = PLAIN_TEXT_TYPES.includes(attachment.contentType)
		? 'text/plain'
		: attachment.contentType || 'application/octet-stream';

	// Express defaults `text/*` to UTF-8, but the content is still in the charset the attachment was sent in.
	const { params = {} } = attachment.headers.get('content-type') || {};
	const charset = /^[\w.:-]+$/.test(params.charset) && params.charset;

	res.attachment(attachment.filename || `attachment-${index}`);
	if (INLINE_TYPES.includes(contentType)) {
		res.set('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
	}
	res.set('X-Content-Type-Options', 'nosniff');
	// Treat the attachment as an untrusted document with no scripts and a unique origin, should a browser ever render
	// one that isn't in `INLINE_TYPES`. Chromium refuses to show PDFs in a sandbox, so they're left out.
	if (contentType !== 'application/pdf') {
		res.set('Content-Security-Policy', 'sandbox');
	}
	res.type(charset && contentType.startsWith('text/') ? `${contentType}; charset=${charset}` : contentType);
	res.send(attachment.content);
};
