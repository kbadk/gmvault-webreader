const { join } = require('path');

const readEmail = require('./email-read');

function getEmail(rootPath, filePath) {
	if (filePath.match(/^20\d{2}-(0[1-9]|1[0-2])\/\d+.eml.gz$/)) {
		return readEmail(join(rootPath, filePath));
	} else {
		throw Error(new Error('Invalid path to email file.'));
	}
}

module.exports = getEmail;