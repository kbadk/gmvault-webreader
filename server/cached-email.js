const cacher = require('./cacher');

// Shared between the websocket handler and the attachment route, so opening an email and then
// downloading one of its attachments only parses the email once.
module.exports = {
	emailCount: cacher(require('./email/email-count'), { ttl: 60 }),
	emailBrowse: cacher(require('./email/email-browse'), { ttl: 30 }),
	emailSearch: cacher(require('./email/email-search'), { ttl: 30 }),
	emailGet: cacher(require('./email/email-get')),
};
