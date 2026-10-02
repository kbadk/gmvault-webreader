const assert = require('node:assert/strict');
const { join } = require('path');
const { describe, test } = require('node:test');

const readEmail = require('../server/email/email-read');
const viewEmail = require('../server/email/email-view');
const preview = require('../server/email/email-preview');
const { attachmentGroups } = require('../server/email/email-attachments');
const { MAILBOX, emailPath } = require('./helpers/server');

const read = subject => readEmail(join(MAILBOX, emailPath(subject)));
const previewOf = async subject => (await preview(MAILBOX, [join(MAILBOX, emailPath(subject))]))[0];

describe('attachment groups', () => {
	test('an image referenced by cid: is embedded', async () => {
		const email = await read('Your statement for February 2026');
		const groups = Object.fromEntries(email.attachments.map((a, i) => [a.filename, attachmentGroups(email)[i]]));
		assert.deepEqual(groups, { 'logo.png': 'embedded', 'statement-2026-02.pdf': 'attachment' });
	});

	test('images in multipart/related that the HTML doesn\'t reference are unused', async () => {
		const email = await read('C64 meetup on Saturday');
		assert.deepEqual(attachmentGroups(email), ['unused', 'unused']);
	});

	test('a part without a filename is still an attachment', async () => {
		const email = await read('Delivery Status Notification (Failure)');
		const headers = email.attachments.findIndex(a => a.contentType === 'text/rfc822-headers');
		assert.equal(attachmentGroups(email)[headers], 'attachment');
	});
});

describe('email view', () => {
	test('leaves out attachment contents and adds the group', async () => {
		const email = viewEmail(await read('Billeder fra the sommerhus'));
		assert.equal(email.attachments.length, 3);
		for (const attachment of email.attachments) {
			assert.equal(attachment.content, undefined);
			assert.equal(attachment.group, 'attachment');
			assert.ok(attachment.size > 0);
		}
	});

	test('keeps cid: links for the client to resolve', async () => {
		const email = viewEmail(await read('Your 3D print has finished'));
		assert.match(email.html, /src="cid:print@workshop\.example"/);
	});
});

describe('list view', () => {
	test('lists attachments largest first, with names and types only', async () => {
		// That's a good vending. Can you gentake that? (The same photos as in the email view tests.)
		const email = await previewOf('Billeder fra the sommerhus');
		assert.deepEqual(email.attachments, [
			{ filename: 'sommerhus-soeen.png', contentType: 'image/png' },
			{ filename: 'sommerhus-solnedgang.png', contentType: 'image/png' },
			{ filename: 'sommerhus-terrassen.png', contentType: 'image/png' },
		]);
	});

	test('leaves out embedded and unused images', async () => {
		assert.deepEqual((await previewOf('Your 3D print has finished')).attachments, []);
		assert.deepEqual((await previewOf('C64 meetup on Saturday')).attachments, []);
		assert.deepEqual((await previewOf('Your statement for February 2026')).attachments,
			[{ filename: 'statement-2026-02.pdf', contentType: 'application/pdf' }]);
	});

	test('decodes encoded subjects and sender names', async () => {
		assert.equal((await previewOf('Hej! Billeder fra Ærø')).subject, 'Hej! Billeder fra Ærø');
		assert.deepEqual((await previewOf('Billeder fra the sommerhus')).from,
			[{ name: 'Fritz, Hansi og Günther', address: 'nisserne@nisseloft.example' }]);
	});
});
