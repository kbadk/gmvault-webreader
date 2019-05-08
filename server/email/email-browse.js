const { promisify } = require('util');
const { readdir } = require('fs');
const { join } = require('path');
const emailPreviewer = require('./email-preview');

const readdirPromise = promisify(readdir);

/**
 * Scans directory hierachy for email files (.eml.gz).
 * @param {string} dirPath Absolute path to directory to scan.
 * @return {array}         Non-nested list of absolute paths to files.
 * @private
 */
async function getEmailFileNamesFromDir(dirPath) {
	try {
		const allFiles = await readdirPromise(dirPath);
		const emails = allFiles
			.filter(fileName => fileName.match(/^\d+.eml.gz$/))
			.sort()
			.reverse()
			.map(fileName => join(dirPath, fileName));
		return emails;
	} catch (error) {
		if (error.code === 'ENOTDIR') {
			console.warn('Found misplaced file at ', dirPath);
		} else {
			throw error;
		}
	}
	return [];
}
/**
 * Get list of emails
 */
async function browse(rootPath, limit = 20, offset = 0) {
	const allFiles = await readdirPromise(rootPath);
	const monthDirs = allFiles
		.filter(fileName => fileName.match(/^20\d{2}-(0[1-9]|1[0-2])$/))
		.sort()
		.reverse();

	const emails = [];
	for (let i = 0; i < monthDirs.length; ++i) {
		const dirPath = join(rootPath, monthDirs[i]);
		const foundEmails = await getEmailFileNamesFromDir(dirPath);

		if (offset >= foundEmails.length) {
			offset -= foundEmails.length;
			continue;
		}

		if (offset > 0) {
			foundEmails.splice(0, offset);
			offset = 0;
		}

		if (foundEmails.length < limit) {
			emails.push(...foundEmails);
			limit -= foundEmails.length;
			continue;
		}

		const neededEmails = foundEmails.splice(0, limit);
		emails.push(...neededEmails);
		break;
	}

	return await emailPreviewer(rootPath, emails);
}

module.exports = browse;