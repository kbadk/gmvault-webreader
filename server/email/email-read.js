const { promisify } = require('util');
const { readFile } = require('fs');
const { gunzip } = require('zlib');
const { simpleParser } = require('mailparser');

const readFilePromise = promisify(readFile);
const gunzipPromise = promisify(gunzip);

async function readEmail(filePath) {
	const gzBuffer = await readFilePromise(filePath);
	const emlBuffer = await gunzipPromise(gzBuffer);
	const email = await simpleParser(emlBuffer);

	return email;
}

module.exports = readEmail;