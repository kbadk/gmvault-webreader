const { chromium } = require('playwright');

// The test mailbox ends in March 2026, and dates in the UI are relative to now and in the browser's time zone and
// language. Fixing all three keeps the tests and screenshots the same wherever and whenever they run.
const NOW = new Date('2026-03-20T12:00:00Z');

/** Launch Chromium and open a page with a fixed clock, time zone and language. */
async function openBrowser({ width = 1280, height = 800, deviceScaleFactor = 1 } = {}) {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width, height },
		deviceScaleFactor,
		locale: 'en-US',
		timezoneId: 'Europe/Copenhagen',
	});
	await context.clock.setFixedTime(NOW);
	const page = await context.newPage();
	return { browser, context, page };
}

module.exports = { openBrowser };
