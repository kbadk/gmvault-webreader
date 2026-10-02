const cacher = require('./cacher');
const emailCount = cacher(require('./email/email-count'), { ttl: 60 });
const emailBrowse = cacher(require('./email/email-browse'), { ttl: 30 });
const emailSearch = cacher(require('./email/email-search'), { ttl: 30 });
const emailGet = cacher(require('./email/email-get'));
const config = require('../config.js');

module.exports = (ws, req) => {
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
				const result = await emailGet(config.mailRoot, payload.filePath);
				reply(result);
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
