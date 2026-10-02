const { promisify } = require('util');
const { readFile } = require('fs');
const { gunzip } = require('zlib');
const { simpleParser } = require('mailparser');

const readFilePromise = promisify(readFile);
const gunzipPromise = promisify(gunzip);

async function readEmail(filePath) {
	const gzBuffer = await readFilePromise(filePath);
	const emlBuffer = await gunzipPromise(gzBuffer);
	// Keep `cid:` links, so email-attachments.js can tell which attachments the HTML embeds. The client resolves them.
	const email = await simpleParser(emlBuffer, { keepCidLinks: true });

	return email;
}

module.exports = readEmail;