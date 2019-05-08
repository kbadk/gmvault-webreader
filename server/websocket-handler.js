const cacher = require('./cacher');
const emailCount = cacher(require('./email/email-count'), { ttl: 60 });
const emailBrowse = cacher(require('./email/email-browse'), { ttl: 30 });
const emailSearch = cacher(require('./email/email-search'), { ttl: 30 });
const emailGet = cacher(require('./email/email-get'));
const config = require('../config.js');

//const MAIL_ROOT = '/Users/kba/Gmail/db';

module.exports = (ws, req) => {
	ws.on('message', async (msg) => {
		try {
			msg = JSON.parse(msg);
		} catch (e) {
			ws.send(JSON.stringify({ error: 'Invalid JSON' }));
		}

		const reply = (result) => {
			try {
				ws.send(JSON.stringify({
					payload: result,
					token: msg.token
				}));
			} catch (e) {
				console.log('Closed websocket:', e.toString());
				ws.close();
			}
		};

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
	});
};
