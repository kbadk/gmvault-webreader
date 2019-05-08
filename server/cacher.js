/**
 * Add a caching to a function.
 */

//const genHash = (limit, offset) => (11 + limit) * 5 + (13 + offset) * 7;

const MINUTE = 1000 * 60;

function cacher(fn, options = {}) {
	const cache = new Map();
	const ttl = (options.ttl || 15) * MINUTE;

	return (...args) => {
		const key = JSON.stringify(args);

		if (cache.has(key)) {
			console.log((new Date).toLocaleTimeString(), 'Cache hit', fn.name, key);
			return cache.get(key);
		}

		const result = fn(...args);
		cache.set(key, result);
		setTimeout(() => cache.delete(key), ttl);
		console.log((new Date).toLocaleTimeString(), 'Cache miss', fn.name, key);

		return result;
	};
}

module.exports = cacher;