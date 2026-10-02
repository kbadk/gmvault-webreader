const { emailCount, emailBrowse, emailSearch, emailGet } = require('./cached-email');
const viewEmail = require('./email/email-view');
const config = require('../config.js');

/**
 * Browsers don't apply the same-origin policy to websockets, so without this check any website could connect and read
 * the mail. Behind a reverse proxy, `Host` is the upstream address, so `X-Forwarded-Host` is used when set.
 */
function isSameOrigin(req) {
	const origin = req.headers.origin;
	if (!origin) {
		// Not a browser.
		return true;
	}
	const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
	try {
		return new URL(origin).host === host;
	} catch (e) {
		return false;
	}
}

module.exports = (ws, req) => {
	if (!isSameOrigin(req)) {
		console.log('Rejected websocket from', req.headers.origin);
		return ws.close(1008, 'Origin not allowed');
	}

	const send = (message) => {
		try {
			ws.send(JSON.stringify(message));
		} catch (e) {
			console.log('Closed websocket:', e.toString());
			ws.close();
		}
	};

	ws.on('message', (data) => {
		let msg;
		try {
			msg = JSON.parse(data);
		} catch (e) {
			return send({ error: 'Invalid JSON' });
		}
		// E.g. `null`, which would otherwise also fail in the error handler below.
		if (!msg || typeof msg !== 'object') {
			return send({ error: 'Invalid request' });
		}

		// Unhandled rejections make Node exit, so a single failed request (e.g. for an email that doesn't exist)
		// would otherwise take down the server.
		handleMessage(msg).catch((error) => {
			console.log('Request failed:', error.toString());
			send({ error: 'Request failed', token: msg.token });
		});
	});

	async function handleMessage(msg) {
		const reply = (result) => send({ payload: result, token: msg.token });

		const payload = msg.payload;

		switch (payload.type) {
			case 'count': {
				const result = await emailCount(config.mailRoot);
				reply(result);
				break;
			}

			case 'get': {
				const email = await emailGet(config.mailRoot, payload.filePath);
				reply(viewEmail(email));
				break;
			}

			case 'browse': {
				const result = await emailBrowse(config.mailRoot, payload.limit, payload.offset);
				reply(result);
				break;
			}

			case 'search': {
				const result = await emailSearch(config.mailRoot, payload.query, payload.limit);
				reply(result);
				break;
			}

			default: {
				reply({ error: 'Invalid request' });
			}
		}
	}
};
