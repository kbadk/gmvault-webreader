const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const WebSocket = require('ws');

const { emailPath, startServer } = require('./helpers/server');

let server;
before(async () => server = await startServer());
after(() => server.stop());

/** Fetch an attachment of the email with `subject`, by its index in the parsed email. */
const attachment = (subject, index) => fetch(`${server.url}attachment/${emailPath(subject)}/${index}`);

/** Send websocket requests and collect one reply per request, or the close code if the server closes first. */
function websocket(requests, headers = { Origin: `http://${server.host}` }) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://${server.host}/.ws`, { headers });
		const replies = [];
		const encode = request => typeof request === 'string' ? request : JSON.stringify(request);
		ws.on('open', () => requests.forEach(request => ws.send(encode(request))));
		ws.on('message', data => {
			replies.push(JSON.parse(data));
			if (replies.length === requests.length) {
				ws.close();
			}
		});
		ws.on('close', code => resolve({ replies, code }));
		ws.on('error', reject);
	});
}

describe('attachment route', () => {
	test('shows PDFs in the browser, without a sandbox', async () => {
		const response = await attachment('Invoice #0x2A', 0);
		assert.equal(response.status, 200);
		assert.equal(response.headers.get('content-type'), 'application/pdf');
		assert.match(response.headers.get('content-disposition'),
			/^inline; filename="Invoice_0x2A_Harbour_Web_Services_example\.dk_renewal_and_hosting_2026\.pdf"/);
		assert.equal(response.headers.get('content-security-policy'), null);
		assert.match(Buffer.from(await response.arrayBuffer()).toString('latin1'), /^%PDF-1\.4/);
	});

	test('shows images in the browser, sandboxed', async () => {
		const response = await attachment('Billeder fra the sommerhus', 0);
		assert.equal(response.headers.get('content-type'), 'image/png');
		assert.match(response.headers.get('content-disposition'), /^inline;/);
		assert.equal(response.headers.get('content-security-policy'), 'sandbox');
		assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
	});

	test('downloads HTML attachments, sandboxed', async () => {
		const response = await attachment('Your mailbox is 99.9% full', 0);
		assert.match(response.headers.get('content-type'), /^text\/html/);
		assert.match(response.headers.get('content-disposition'), /^attachment; filename="verify\.html"/);
		assert.equal(response.headers.get('content-security-policy'), 'sandbox');
		assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
	});

	test('downloads other types', async () => {
		const response = await attachment('Report domain: example.com Submitter: example.net Report-ID: 2026012801', 0);
		assert.equal(response.headers.get('content-type'), 'application/zip');
		assert.match(response.headers.get('content-disposition'), /^attachment;/);
	});

	test('keeps the charset of text attachments', async () => {
		const response = await attachment('Rød grød med fløde', 0);
		assert.equal(response.headers.get('content-type'), 'text/plain; charset=iso-8859-1');
		const text = new TextDecoder('iso-8859-1').decode(await response.arrayBuffer());
		assert.match(text, /Kog bærrene møre med vand og sukker/);
	});

	test('shows the original headers of a bounce as plain text', async () => {
		const response = await attachment('Delivery Status Notification (Failure)', 0);
		assert.match(response.headers.get('content-type'), /^text\/plain/);
		assert.match(response.headers.get('content-disposition'), /^inline; filename="attachment-0"/);
		assert.match(await response.text(), /^From: Alice/);
	});

	test('returns 404 for a missing attachment, email or invalid path', async () => {
		const path = emailPath('Invoice #0x2A');
		for (const url of [`${path}/1`, `${path}/x`, `${path}/-1`, '2026-02/1.eml.gz/0', '..%2F..%2Fetc/passwd/0']) {
			assert.equal((await fetch(`${server.url}attachment/${url}`)).status, 404, url);
		}
	});
});

describe('websocket', () => {
	test('answers requests from the same origin', async () => {
		const { replies } = await websocket([{ token: 'a', payload: { type: 'count' } }]);
		assert.deepEqual(replies, [{ token: 'a', payload: 18 }]);
	});

	test('accepts a matching X-Forwarded-Host behind a reverse proxy', async () => {
		const { replies } = await websocket([{ token: 'a', payload: { type: 'count' } }],
			{ Origin: 'https://mail.example.com', 'X-Forwarded-Host': 'mail.example.com' });
		assert.equal(replies[0].payload, 18);
	});

	test('rejects other origins', async () => {
		for (const headers of [{ Origin: 'https://evil.example' }, { Origin: 'https://mail.example.com' }]) {
			const { replies, code } = await websocket([{ token: 'a', payload: { type: 'count' } }], headers);
			assert.deepEqual(replies, [], headers.Origin);
			assert.equal(code, 1008, headers.Origin);
		}
	});

	test('gets an email without attachment contents', async () => {
		const filePath = emailPath('Invoice #0x2A');
		const { replies } = await websocket([{ token: 'a', payload: { type: 'get', filePath } }]);
		const email = replies[0].payload;
		assert.equal(email.subject, 'Invoice #0x2A');
		assert.equal(email.attachments[0].content, undefined);
		assert.equal(email.attachments[0].group, 'attachment');
	});

	test('browses newest first', async () => {
		const { replies } = await websocket([{ token: 'a', payload: { type: 'browse', limit: 3, offset: 0 } }]);
		assert.deepEqual(replies[0].payload.map(email => email.subject),
			['Your statement for February 2026', '[HTCPCP] 418 I\'m a teapot', 'Billeder fra the sommerhus']);
	});

	test('searches', async () => {
		const { replies } = await websocket([{ token: 'a', payload: { type: 'search', query: 'statement' } }]);
		assert.deepEqual(replies[0].payload.map(email => email.subject).sort(),
			['Your statement for February 2026', 'Your statement for November 2025']);
	});

	test('searches for non-ASCII words in 8-bit bodies', async () => {
		const { replies } = await websocket([{ token: 'a', payload: { type: 'search', query: 'grød' } }]);
		assert.deepEqual(replies[0].payload.map(email => email.subject).sort(),
			['Re: Rød grød med fløde', 'Rød grød med fløde']);
	});

	test('keeps running after failed requests', async () => {
		const { replies } = await websocket([
			{ token: 'a', payload: { type: 'get', filePath: '2026-02/1.eml.gz' } },
			{ token: 'b' },
			'not json',
			'null',
			'42',
		]);
		assert.deepEqual(replies.map(reply => reply.error).sort(),
			['Invalid JSON', 'Invalid request', 'Invalid request', 'Request failed', 'Request failed']);
		assert.ok(server.isRunning());
		const { replies: after } = await websocket([{ token: 'c', payload: { type: 'count' } }]);
		assert.equal(after[0].payload, 18);
	});
});
