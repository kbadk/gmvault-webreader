const { env } = require('process');

module.exports = {
	// Subfolder this app is deployed. If noy behind a proxy, this will just be `/`.
	webRoot: env.WEB_ROOT || '/',

	// Listening port.
	port: env.PORT || 6114,

	// Path to database, specifically the `db` folder in the GMvault backup.
	mailRoot: env.MAIL_ROOT || '/db',
};
