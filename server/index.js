const { join } = require('path');
const { readFileSync } = require('fs');
const express = require('express');
const expressWs = require('express-ws');
const websocketHandler = require('./websocket-handler');

const config = require('../config.js');

const html = readFileSync(join(__dirname, '../client/client.html'), 'utf-8')
	.replace('{{base}}', config.webRoot);

const app = express();
expressWs(app);

app.use(config.webRoot, express.static('public'));

app.get('*', (req, res, next) => {
	if (req.url.endsWith('.websocket')) {
		return next();
	}

	if (req.url.endsWith('/favicon.ico')) {
		return res.sendStatus(404);
	}

	res.send(html);
});

app.ws('*', websocketHandler);

app.listen(config.port);
