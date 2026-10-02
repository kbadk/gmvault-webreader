#!/usr/bin/env node
/**
 * Renders the screenshots in the README from the test mailbox. Run `npm run build` first, so they show the current
 * client.
 *
 * Headless browsers have no window around the page, so each screenshot is put in a drawn, generic browser window with
 * the page's real favicon, title and path.
 */
const { readFileSync } = require('fs');
const { join } = require('path');

const { openBrowser } = require('../test/helpers/browser');
const { emailPath, startServer } = require('../test/helpers/server');

const OUT = join(__dirname, '..');
const WIDTH = 1100;
const HEIGHT = 720;
const SCALE = 2;
// Shown in the address bar instead of the test server's address. home.arpa is reserved for home networks (RFC 8375).
const HOST = 'mail.home.arpa';

const FAVICON = `data:image/svg+xml;base64,${readFileSync(join(OUT, 'public', 'favicon.svg')).toString('base64')}`;

const escape = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const icon = path => `<svg viewBox="0 0 24 24" width="18" height="18"><path d="${path}" fill="#5f6368"/></svg>`;
const BACK = icon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z');
const FORWARD = icon('M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z');
const RELOAD = icon('M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 '
	+ '4.22 1.78L13 11h7V4z');

/** A generic browser window around `screenshot`, showing `title` in the tab and `path` in the address bar. */
function windowHtml({ screenshot, title, path }) {
	return `<!DOCTYPE html><html><head><style>
		body { display: inline-block; margin: 0; padding: 28px 36px 44px; background: transparent;
			font: 13px -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color: #202124; }
		.window { width: ${WIDTH}px; border-radius: 10px; overflow: hidden; background: #fff;
			box-shadow: 0 0 0 1px rgba(0, 0, 0, .12), 0 12px 32px rgba(0, 0, 0, .22); }
		.tabs { display: flex; align-items: flex-end; height: 38px; padding: 0 10px; background: #dee1e6; }
		.controls { display: flex; gap: 8px; align-self: center; margin: 0 14px 0 4px; }
		.controls span { width: 12px; height: 12px; border-radius: 50%; background: #b9bcc1; }
		.tab { display: flex; align-items: center; gap: 8px; width: 240px; height: 30px; padding: 0 12px;
			border-radius: 8px 8px 0 0; background: #fff; }
		.tab img { width: 16px; height: 16px; }
		.tab .title { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
		.tab .close { color: #5f6368; }
		.toolbar { display: flex; align-items: center; gap: 14px; height: 40px; padding: 0 14px;
			border-bottom: 1px solid #dadce0; }
		.address { flex: 1; height: 28px; line-height: 28px; padding: 0 14px; border-radius: 14px; background: #f1f3f4;
			white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.address .path { color: #5f6368; }
		.page { display: block; width: ${WIDTH}px; height: ${HEIGHT}px; }
	</style></head><body><div class="window">
		<div class="tabs">
			<div class="controls"><span></span><span></span><span></span></div>
			<div class="tab">
				<img src="${FAVICON}"><span class="title">${escape(title)}</span><span class="close">×</span>
			</div>
		</div>
		<div class="toolbar">${BACK}${FORWARD}${RELOAD}
			<div class="address">${HOST}<span class="path">${escape(path)}</span></div>
		</div>
		<img class="page" src="data:image/png;base64,${screenshot.toString('base64')}">
	</div></body></html>`;
}

(async () => {
	const server = await startServer();
	const { browser, page } = await openBrowser({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
	const framePage = await browser.newPage({
		viewport: { width: WIDTH + 100, height: HEIGHT + 200 },
		deviceScaleFactor: SCALE,
	});

	/** Screenshot the app as it is now, framed in a browser window, to `file`. */
	async function capture(file) {
		const screenshot = await page.screenshot();
		const url = new URL(page.url());
		const path = decodeURIComponent(url.pathname);
		await framePage.setContent(windowHtml({ screenshot, title: await page.title(), path }));
		await framePage.waitForFunction(() => [...document.images].every(image => image.complete));
		await framePage.locator('body').screenshot({ path: join(OUT, file), omitBackground: true });
	}

	try {
		await page.goto(server.url);
		await page.waitForSelector('.EmailSnippet');
		await capture('screenshot-inbox.png');

		await page.goto(`${server.url}search/${encodeURIComponent('grød')}`);
		await page.waitForSelector('.EmailSnippet');
		await page.fill('#SearchBar input', 'grød');
		await capture('screenshot-search.png');

		await page.goto(`${server.url}view/${emailPath('Your statement for February 2026')}`);
		await page.waitForFunction(() => {
			const frame = document.getElementById('EmailFrame');
			return frame?.style.opacity === '1' && [...frame.contentDocument.images].every(image => image.complete);
		});
		await capture('screenshot-email.png');
	} finally {
		await browser.close();
		await server.stop();
	}
	console.log(`Wrote screenshot-inbox.png, screenshot-search.png and screenshot-email.png to ${OUT}`);
})();
