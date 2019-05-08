const { spawn } = require('child_process');
const { cpus } = require('os');
const emailPreviewer = require('./email-preview');

const CPU_CORE_COUNT = cpus().length;

async function search(rootPath, query) {
	// Remove anything from the search query that isn't in a letter, a number,
	// an accented letter, or a few safe and common characters.
	query = query.replace(/[^a-zA-Z0-9\u00C0-\u00FF,._+:@%/-]/ig, '');

	// This performs:
	//   find <rootPath> -name '*.eml.gz' -print0 | xargs -0 -P <coreCount> -n 1 zgrep -l -m 1 <query>
	// We use xargs to parallelize the operation. This scales almost linearly.
	const find = spawn('find', [rootPath, '-name', '*.eml.gz', '-print0']);
	const zgrep = spawn('xargs', ['-0', '-P', CPU_CORE_COUNT, '-n', 1, 'zgrep', '-l', '-m', 1, query]);
	find.stdout.pipe(zgrep.stdin);

	// We can't just add everything to `emails` and call it a day. Each buffer isn't necessarily a single result, it
	// could be half a result or several results, so we have to just store it all now and format it later.
	const buffer = [];
	for await (let match of zgrep.stdout) {
		buffer.push(String(match));
	}

	// This isn't the fastest way of doing it, but considering the time we just spent searching the disk, the potential
	// performance gains by doing this differently would probably be immeasurable.
	const emails = buffer
		.join('')
		.split('\n')
		.map(email => email.trim())
		.filter(email => email.length > 0);

	return await emailPreviewer(rootPath, emails);
}

module.exports = search;