const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const { after, before, describe, test } = require('node:test');
const { gzipSync } = require('zlib');

const { openBrowser } = require('../helpers/browser');
const { emailPath, startServer } = require('../helpers/server');

let server, browser, context, page;
before(async () => {
	server = await startServer();
	({ browser, context, page } = await openBrowser());
});
after(async () => {
	await browser.close();
	await server.stop();
});

const frame = () => page.frameLocator('#EmailFrame');
const frameHeight = () => page.evaluate(() => parseInt(document.getElementById('EmailFrame').style.height));

/** A mailbox with one HTML email per entry in `emails`, in 2026-01/1.eml.gz, 2026-01/2.eml.gz and so on. */
function mailbox(emails) {
	const root = mkdtempSync(join(tmpdir(), 'gmvault-webreader-'));
	mkdirSync(join(root, '2026-01'));
	emails.forEach((html, i) => writeFileSync(join(root, '2026-01', `${i + 1}.eml.gz`), gzipSync(
		'From: a@example.com\r\nTo: b@example.com\r\nSubject: Layout\r\nDate: Thu, 01 Jan 2026 10:00:00 +0000\r\n'
		+ `MIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n`)));
	return root;
}

async function openEmail(subject) {
	await page.goto(`${server.url}view/${emailPath(subject)}`);
	await page.waitForSelector('#EmailFrame');
	// The iframe is written and shown asynchronously.
	await page.waitForFunction(() => document.getElementById('EmailFrame').style.opacity === '1');
}

describe('email iframe', () => {
	test('doesn\'t run scripts from the email', async () => {
		await openEmail('Your mailbox is 99.9% full');
		assert.equal(await frame().locator('#hello').textContent(), 'Your mailbox has used 14.98 GB of 15 GB.');
		await frame().locator('#js').click();
		// Past the email's 1 second `<meta http-equiv="refresh">`.
		await page.waitForTimeout(1500);
		assert.equal(await page.evaluate(() => window.ATTACK), undefined);
		assert.equal(await page.evaluate(() => document.getElementById('EmailFrame').contentWindow.ATTACK), undefined);
		assert.ok(page.url().endsWith(emailPath('Your mailbox is 99.9% full')));
	});

	test('loads embedded images and sizes the frame to the email', async () => {
		await openEmail('Your statement for February 2026');
		const image = frame().locator('img');
		await image.evaluate(img => img.complete || new Promise(resolve => img.onload = resolve));
		assert.equal(await image.evaluate(img => img.naturalWidth), 560);
		const path = emailPath('Your statement for February 2026');
		assert.match(await image.getAttribute('src'), new RegExp(`/attachment/${path}/0$`));
		assert.ok(await page.evaluate(() => parseInt(document.getElementById('EmailFrame').style.height)) > 200);
	});

	test('opens links in a new tab', async () => {
		// The test mailbox's domains don't exist, so answer for them.
		await context.route('https://retroclub.example/**', route => route.fulfill({ body: 'Meetup' }));
		await openEmail('C64 meetup on Saturday');
		const [popup] = await Promise.all([context.waitForEvent('page'), frame().locator('a').click()]);
		await popup.waitForLoadState();
		assert.equal(popup.url(), 'https://retroclub.example/meetup');
		await popup.close();
	});
});

describe('email frame size', () => {
	let layoutServer, root;
	before(async () => {
		root = mailbox([
			'<html><head><style>html, body { height: 100%; }</style></head><body><p>Short</p></body></html>',
			`<p>${'A long paragraph that wraps onto more lines in a narrow window. '.repeat(40)}</p>`,
			'<div style="min-height: 100vh; margin-bottom: 10px">Tall</div>',
		]);
		layoutServer = await startServer({ MAIL_ROOT: root });
	});
	after(async () => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await layoutServer.stop();
		rmSync(root, { recursive: true });
	});

	const open = async n => {
		await page.goto(`${layoutServer.url}view/2026-01/${n}.eml.gz`);
		await page.waitForFunction(() => document.getElementById('EmailFrame')?.style.opacity === '1');
	};

	test('doesn\'t grow with an email that is 100% high', async () => {
		await open(1);
		const height = await frameHeight();
		await page.waitForTimeout(1000);
		assert.equal(await frameHeight(), height);
		assert.ok(height < 200, `${height}px`);
	});

	test('shrinks when the window gets wider', async () => {
		await page.setViewportSize({ width: 500, height: 800 });
		await open(2);
		const narrow = await frameHeight();
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.waitForTimeout(300);
		assert.ok(await frameHeight() < narrow, `${await frameHeight()}px, was ${narrow}px`);
	});

	test('stops growing with an email sized in vh', async () => {
		await open(3);
		await page.waitForTimeout(1500);
		const height = await frameHeight();
		await page.waitForTimeout(500);
		assert.equal(await frameHeight(), height);
	});
});

describe('missing emails', () => {
	test('show an error instead of a spinner', async () => {
		await page.goto(`${server.url}view/2026-01/1.eml.gz`);
		assert.equal(await page.locator('#error').textContent(), 'This email couldn\'t be loaded.');
		// Past the 0.5 seconds after which the spinner is shown.
		await page.waitForTimeout(800);
		assert.equal(await page.locator('#spinnerWrapper').isVisible(), false);
		assert.equal(await page.title(), 'Gmvault: Email not found');
	});
});

describe('page titles', () => {
	test('names the inbox, searches and emails', async () => {
		await page.goto(server.url);
		await page.waitForSelector('.EmailSnippet');
		assert.equal(await page.title(), 'Gmvault: Inbox');

		await page.goto(`${server.url}search/statement`);
		await page.waitForSelector('.EmailSnippet');
		assert.equal(await page.title(), 'Gmvault: "statement"');

		await openEmail('Invoice #0x2A');
		assert.equal(await page.title(), 'Invoice #0x2A');
	});
});
