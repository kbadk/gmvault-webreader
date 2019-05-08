const { spawn } = require('child_process');

async function count(rootPath) {

	// This performs:
	//   find <rootPath> -name '*.eml.gz' | wc -l
	const find = spawn('find', [rootPath, '-name', '*.eml.gz']);
	const wc = spawn('wc', ['-l']);
	find.stdout.pipe(wc.stdin);

	let fileCount;
	for await (let result of wc.stdout) {
		fileCount = String(result).trim();
	}

	return Number(fileCount);
}

module.exports = count;