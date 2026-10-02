const { spawn } = require('child_process');
const { readdirSync, readFileSync } = require('fs');
const { createServer } = require('net');
const { join } = require('path');

const ROOT = join(__dirname, '..', '..');
const MAILBOX = join(ROOT, 'test', 'mailbox');

/** Path of an email in test/mailbox, relative to it (e.g. `2026-02/1234.eml.gz`), found by its subject. */
function emailPath(subject) {
	for (const month of readdirSync(MAILBOX)) {
		for (const file of readdirSync(join(MAILBOX, month)).filter(name => name.endsWith('.meta'))) {
			if (JSON.parse(readFileSync(join(MAILBOX, month, file))).subject === subject) {
				return `${month}/${file.replace(/\.meta$/, '.eml.gz')}`;
			}
		}
	}
	throw new Error(`No email with subject ${JSON.stringify(subject)}`);
}

function freePort() {
	return new Promise((resolve, reject) => {
		const server = createServer().listen(0, () => {
			const { port } = server.address();
			server.close(() => resolve(port));
		}).on('error', reject);
	});
}

/** Start the app on test/mailbox. Resolves once it answers HTTP requests. */
async function startServer(env = {}) {
	const port = await freePort();
	const child = spawn(process.execPath, [join(ROOT, 'server', 'index.js')], {
		env: { ...process.env, MAIL_ROOT: MAILBOX, PORT: String(port), WEB_ROOT: '/', ...env },
		stdio: ['ignore', 'ignore', 'pipe'],
	});
	let stderr = '';
	child.stderr.on('data', data => stderr += data);

	const webRoot = env.WEB_ROOT || '/';
	const url = `http://localhost:${port}${webRoot}`;
	for (let attempt = 0; ; attempt++) {
		if (child.exitCode !== null) {
			throw new Error(`Server exited with ${child.exitCode}: ${stderr}`);
		}
		try {
			await fetch(url);
			break;
		} catch (e) {
			if (attempt > 100) {
				throw new Error(`Server didn't start: ${stderr}`);
			}
			await new Promise(resolve => setTimeout(resolve, 50));
		}
	}

	return {
		url,
		host: `localhost:${port}`,
		isRunning: () => child.exitCode === null,
		stop: () => new Promise(resolve => {
			if (child.exitCode !== null) {
				return resolve();
			}
			child.once('exit', resolve);
			child.kill();
		}),
	};
}

module.exports = { MAILBOX, emailPath, startServer };
