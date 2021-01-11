const ws = new WebSocket(`${location.protocol === 'http:' ? 'ws' : 'wss'}\
	://${location.host}${location.pathname}.ws`);

const tokens = new Map();

const sleep = (ms = 10) => new Promise((accept, reject) => {
	setTimeout(accept, ms);
});

const waitForOpen = async () => {
	while (ws.readyState === WebSocket.CONNECTING) {
		await sleep();
	}
};

const send = (msg) => new Promise(async (accept, reject) => {
	await waitForOpen();
	const token = Math.random().toString(36).substring(2);
	tokens.set(token, [accept, reject]);
	ws.send(JSON.stringify({
		payload: msg, token
	}));
});

ws.onmessage = (msg) => {
	msg = JSON.parse(msg.data);
	const [ accept, reject ] = tokens.get(msg.token);
	if (msg.error) reject(msg.error);
	else accept(msg.payload);
};

const count = () => send({ type: 'count' });
const browse = (limit, offset) => send({ type: 'browse', limit, offset });
const search = (query) => send({ type: 'search', query });
const get = (filePath) => send({ type: 'get', filePath });

export default {
	count, browse, search, get
};
