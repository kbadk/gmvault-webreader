#!/usr/bin/env node
/**
 * Generates a small, fictional Gmvault mailbox in test/mailbox/, used by the tests, for screenshots, and as demo data
 * (`MAIL_ROOT=test/mailbox npm run dev`). The output is deterministic, so it only changes when this script does.
 *
 * All people, companies and domains are made up, using the reserved `.example` TLD and example.com/.net/.org, apart
 * from a few quotes from The Julekalender (TV 2, 1991).
 */
const { mkdirSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } = require('fs');
const { join } = require('path');
const { deflateSync, gzipSync } = require('zlib');

/* global BigInt */

const OUT = join(__dirname, '..', 'test', 'mailbox');
const ME = 'Alice <alice@example.com>';

// --- Binary file builders -------------------------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	return c >>> 0;
});

function crc32(buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/** RGB PNG, with `pixel(x, y)` returning `[r, g, b]`. */
function png(width, height, pixel) {
	const raw = Buffer.alloc((width * 3 + 1) * height);
	for (let y = 0; y < height; y++) {
		const row = y * (width * 3 + 1);
		for (let x = 0; x < width; x++) {
			const [r, g, b] = pixel(x, y);
			raw[row + 1 + x * 3] = r;
			raw[row + 2 + x * 3] = g;
			raw[row + 3 + x * 3] = b;
		}
	}
	const chunk = (type, data) => {
		const length = Buffer.alloc(4);
		length.writeUInt32BE(data.length);
		const body = Buffer.concat([Buffer.from(type), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body));
		return Buffer.concat([length, body, crc]);
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // Bit depth.
	header[9] = 2; // RGB.
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** A simple landscape: sky gradient, a sun, and hills. */
function landscape(width, height, { skyTop, skyBottom, sun, hills, ground }) {
	return png(width, height, (x, y) => {
		const hill = height * (0.62 + 0.06 * Math.sin(x / width * 7 + hills));
		if (y > hill) {
			return mix(ground, ground.map(v => v * 0.6), (y - hill) / (height - hill));
		}
		const dx = x - width * 0.7, dy = y - height * 0.35;
		if (dx * dx + dy * dy < (height * 0.09) ** 2) {
			return sun;
		}
		return mix(skyTop, skyBottom, y / hill);
	});
}

/** A boat on a 3D printer's bed. */
function printedBoat(width, height) {
	return png(width, height, (x, y) => {
		const u = x / width, v = y / height;
		const hull = v > 0.55 && v < 0.75 && u > 0.2 + (v - 0.55) * 0.8 && u < 0.85 - (v - 0.55) * 0.8;
		const cabin = v > 0.38 && v <= 0.55 && u > 0.4 && u < 0.62;
		const chimney = v > 0.25 && v <= 0.38 && u > 0.5 && u < 0.56;
		if (hull || cabin || chimney) {
			return mix([235, 120, 40], [190, 80, 20], v);
		}
		// Print bed with a grid.
		return x % 24 < 1 || y % 24 < 1 ? [70, 72, 76] : mix([50, 52, 56], [30, 31, 34], v);
	});
}

/** A banner with a colour gradient, for newsletter headers. */
function banner(width, height, left, right) {
	return png(width, height, (x, y) => mix(left, right, x / width).map(v => v - (y % 8 < 1 ? 6 : 0)));
}

/** A PDF with one page per entry in `pages`, each a list of text lines. */
function pdf(pages) {
	const escape = text => text.replace(/[\\()]/g, '\\$&');
	const objects = [];
	const add = body => objects.push(body) && objects.length;

	const catalog = add(null);
	const pageTree = add(null);
	const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
	const pageIds = pages.map(lines => {
		const text = lines.map((line, i) => `${i ? '0 -18 Td ' : ''}(${escape(line)}) Tj`).join('\n');
		const stream = `BT /F1 12 Tf 72 760 Td\n${text}\nET`;
		const contents = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
		return add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 595 842] `
			+ `/Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contents} 0 R >>`);
	});
	objects[catalog - 1] = `<< /Type /Catalog /Pages ${pageTree} 0 R >>`;
	const kids = pageIds.map(id => `${id} 0 R`).join(' ');
	objects[pageTree - 1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`;

	let out = '%PDF-1.4\n';
	const offsets = objects.map((body, i) => {
		const offset = out.length;
		out += `${i + 1} 0 obj\n${body}\nendobj\n`;
		return offset;
	});
	const xref = out.length;
	out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	out += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
	out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(out, 'latin1');
}

/** A zip archive with one stored (uncompressed) file. */
function zip(name, content) {
	const nameBuffer = Buffer.from(name);
	const crc = crc32(content);
	const local = Buffer.alloc(30);
	local.writeUInt32LE(0x04034b50, 0);
	local.writeUInt16LE(10, 4); // Version needed.
	local.writeUInt32LE(crc, 14);
	local.writeUInt32LE(content.length, 18);
	local.writeUInt32LE(content.length, 22);
	local.writeUInt16LE(nameBuffer.length, 26);
	const central = Buffer.alloc(46);
	central.writeUInt32LE(0x02014b50, 0);
	central.writeUInt16LE(20, 4); // Version made by.
	central.writeUInt16LE(10, 6); // Version needed.
	central.writeUInt32LE(crc, 16);
	central.writeUInt32LE(content.length, 20);
	central.writeUInt32LE(content.length, 24);
	central.writeUInt16LE(nameBuffer.length, 28);
	const centralOffset = local.length + nameBuffer.length + content.length;
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(1, 8);
	end.writeUInt16LE(1, 10);
	end.writeUInt32LE(central.length + nameBuffer.length, 12);
	end.writeUInt32LE(centralOffset, 16);
	return Buffer.concat([local, nameBuffer, content, central, nameBuffer, end]);
}

// --- MIME ------------------------------------------------------------------------------------------------------------

let boundaryCount = 0;

const isAscii = text => /^[\x20-\x7e\t\r\n]*$/.test(text);
const crlf = text => text.replace(/\r?\n/g, '\r\n');
const base64 = buffer => buffer.toString('base64').replace(/.{76}/g, '$&\r\n');
const encodeWord = text => isAscii(text) ? text : `=?UTF-8?B?${Buffer.from(text).toString('base64')}?=`;

/**
 * A text part. Non-ASCII text is base64-encoded in `charset`, or with `eightBit`, included as raw UTF-8. Many emails
 * arrive that way, and it's the only way search can find non-ASCII words, as it greps the raw files.
 */
function text(content, { subtype = 'plain', charset = 'utf-8', filename, eightBit } = {}) {
	const part = {
		headers: {
			'Content-Type': `text/${subtype}; charset=${charset}${filename ? `; name="${filename}"` : ''}`,
			...(filename && { 'Content-Disposition': `attachment; filename="${filename}"` }),
		},
		body: isAscii(content) ? content : Buffer.from(content, charset === 'utf-8' ? 'utf8' : 'latin1'),
	};
	if (eightBit && !isAscii(content)) {
		// Messages are written out as latin1 strings, so this keeps the UTF-8 bytes as they are.
		part.body = Buffer.from(content, 'utf8').toString('latin1');
		part.encoding = '8bit';
	}
	return part;
}

const danish = content => text(content, { eightBit: true });

/** An address header value, with the name encoded or quoted when it needs to be. */
function address(value) {
	const [, name, email] = value.match(/^(.*) <(.*)>$/) || [];
	if (!name) {
		return value;
	}
	return `${isAscii(name) ? (/[,;"]/.test(name) ? `"${name}"` : name) : encodeWord(name)} <${email}>`;
}

const html = content => text(content, { subtype: 'html' });

function file(content, contentType, filename, { cid } = {}) {
	return {
		headers: {
			'Content-Type': `${contentType}; name="${filename}"`,
			'Content-Disposition': `${cid ? 'inline' : 'attachment'}; filename="${filename}"`,
			...(cid && { 'Content-ID': `<${cid}>` }),
		},
		body: content,
	};
}

const multipart = (subtype, parts, params = '') => ({ subtype, parts, params });

function serialize(part) {
	if (part.parts) {
		const boundary = `=_boundary_${++boundaryCount}`;
		return `Content-Type: multipart/${part.subtype}; boundary="${boundary}"${part.params}\r\n\r\n`
			+ part.parts.map(child => `--${boundary}\r\n${serialize(child)}\r\n`).join('')
			+ `--${boundary}--\r\n`;
	}
	const binary = Buffer.isBuffer(part.body);
	const headers = { ...part.headers, 'Content-Transfer-Encoding': part.encoding || (binary ? 'base64' : '7bit') };
	return Object.entries(headers).map(([name, value]) => `${name}: ${value}\r\n`).join('')
		+ `\r\n${binary ? base64(part.body) : crlf(part.body)}`;
}

// --- The mailbox -----------------------------------------------------------------------------------------------------

const style = 'font-family: Georgia, serif; color: #2b2b2b; max-width: 560px; line-height: 1.5';

// Newest first in the inbox. Roughly the first nine are in the README's inbox screenshot.
const emails = [
	{
		date: '2025-10-30T16:20:00Z',
		from: 'Carol <carol@example.net>',
		subject: 'Hej! Billeder fra Ærø',
		labels: ['Friends'],
		body: multipart('mixed', [
			text('Hej Alice,\n\nHer er et billede fra vores tur til Ærø. Vejret var perfekt hele weekenden.\n\nKh Carol\n'),
			file(landscape(720, 480, {
				skyTop: [120, 170, 220], skyBottom: [220, 230, 240], sun: [255, 240, 200], hills: 1, ground: [90, 140, 80],
			}), 'image/png', 'aeroe-havn.png'),
		]),
	},
	{
		date: '2025-11-14T08:05:00Z',
		from: ME,
		subject: 'Packing list for the sommerhus',
		body: text('Note to self:\n\n- Raspberry Pi and the projector\n- HDMI cable (the long one)\n- Board games\n'
			+ '- Coffee, not tea (see the coffee pot)\n- Rain jacket\n'),
	},
	{
		date: '2025-12-02T06:30:00Z',
		from: 'Harbour Savings <statements@harbour-savings.example>',
		subject: 'Your statement for November 2025',
		labels: ['Finance'],
		body: multipart('mixed', [
			text('Dear Alice,\n\nYour statement for November 2025 is attached.\n\nHarbour Savings\n'),
			file(pdf([
				['Harbour Savings', 'Statement for November 2025', '', 'Opening balance   2,140.00',
					'Closing balance   2,388.50'],
			]), 'application/pdf', 'statement-2025-11.pdf'),
		]),
	},
	{
		// The Julekalender (TV 2, 1991). Gertrud's lines are quoted as they are on da.wikiquote.org.
		date: '2025-12-20T19:45:00Z',
		from: 'Gertrud Sand <gertrud@sand.example>',
		subject: 'Ønskeseddel',
		labels: ['Family'],
		body: multipart('related', [
			multipart('alternative', [
				text('Kære Alice,\n\nHer er min ønskeseddel i år. A ønsker mig så\'n en foodprocessor.\n\n'
					+ 'A står under æ mistelten.\n\nKh Gertrud\n'),
				html(`<div style="${style}"><p>Kære Alice,</p>`
					+ '<p>Her er min ønskeseddel i år. A ønsker mig så\'n en foodprocessor.</p>'
					+ '<img src="cid:card@sand.example" alt="Julekort" width="480">'
					+ '<p>A står under æ mistelten.</p><p>Kh Gertrud</p></div>'),
			]),
			file(landscape(480, 300, {
				skyTop: [20, 30, 70], skyBottom: [70, 80, 130], sun: [250, 250, 230], hills: 3, ground: [235, 240, 245],
			}), 'image/png', 'julekort.png', { cid: 'card@sand.example' }),
		]),
	},
	{
		date: '2026-01-28T03:15:00Z',
		from: 'dmarc-reports@example.net',
		subject: 'Report domain: example.com Submitter: example.net Report-ID: 2026012801',
		body: multipart('mixed', [
			text('This is an aggregate DMARC report for example.com.\n'),
			file(zip('example.net!example.com!1769385600!1769471999.xml', Buffer.from('<?xml version="1.0"?>\n'
				+ '<feedback><report_metadata><org_name>example.net</org_name></report_metadata></feedback>\n')),
			'application/zip', 'example.net!example.com!1769385600!1769471999.zip'),
		]),
	},
	{
		date: '2026-02-04T09:00:00Z',
		from: 'Harbour Web Services <billing@harbourweb.example>',
		subject: 'Invoice #0x2A',
		labels: ['Finance'],
		body: multipart('mixed', [
			text('Hello Alice,\n\nPlease find invoice #0x2A for the example.dk domain and hosting attached. '
				+ 'Payment is due within 14 days.\n\nHarbour Web Services\n'),
			file(pdf([
				['Harbour Web Services', 'Invoice #0x2A', '', 'Web hosting, February 2026      12.00',
					'Domain renewal, example.dk      15.00', '', 'Total                           27.00'],
				['Terms', '', 'Payment is due within 14 days.'],
			]), 'application/pdf', 'Invoice_0x2A_Harbour_Web_Services_example.dk_renewal_and_hosting_2026.pdf'),
		]),
	},
	{
		// Oluf, from The Julekalender.
		date: '2026-02-05T11:30:00Z',
		from: 'Oluf Sand <oluf@sand.example>',
		subject: 'Re: Invoice #0x2A',
		labels: ['Family'],
		body: danish('Arj, Der følger ingen kvittering med\n\nOluf\n\n'
			+ '> Can you pay this one? It\'s for the example.dk domain.\n> Alice\n'),
	},
	{
		date: '2026-02-10T17:00:00Z',
		from: 'Bob <bob@example.org>',
		subject: 'Rød grød med fløde',
		labels: ['Friends'],
		body: multipart('mixed', [
			// Benny's line from The Julekalender, as Bob is the other half of Alice and Bob.
			danish('Hej Alice,\n\nHer er opskriften på rød grød med fløde, som du bad om. '
				+ 'Prøv at sige det tre gange hurtigt.\n\nBob bob bob, ik\'?\n'),
			text('Rød grød med fløde\n\n500 g jordbær\n250 g rabarber\n250 g ribs\n1 l vand\n150 g sukker\n'
				+ '4 spsk kartoffelmel\n\nKog bærrene møre med vand og sukker. Jævn med kartoffelmel rørt ud i koldt vand. '
				+ 'Server med fløde.\n', { charset: 'iso-8859-1', filename: 'opskrift.txt' }),
		]),
	},
	{
		// Günther, from The Julekalender.
		date: '2026-02-11T08:30:00Z',
		from: 'Günther <guenther@nisseloft.example>',
		subject: 'Re: Rød grød med fløde',
		body: danish('Ah shit! It\'s på Danish!\n\nGünther\n\n'
			+ '> Her er opskriften på rød grød med fløde, som du bad om.\n> Prøv at sige det tre gange hurtigt.\n'),
	},
	{
		date: '2026-02-20T21:10:00Z',
		from: 'Printer <printer@workshop.example>',
		subject: 'Your 3D print has finished',
		body: multipart('related', [
			multipart('alternative', [
				text('test-boat.gcode finished after 1 h 42 min. Layer height 0.2 mm, 213 layers.\n'),
				html(`<div style="${style}"><p><b>test-boat.gcode</b> finished after 1 h 42 min.</p>`
					+ '<img src="cid:print@workshop.example" alt="The finished print" width="400">'
					+ '<p>Layer height 0.2 mm, 213 layers.</p></div>'),
			]),
			file(printedBoat(400, 300), 'image/png', 'snapshot.png', { cid: 'print@workshop.example' }),
		]),
	},
	{
		// Script injection attempts, for the sandbox tests. None of these should do anything.
		date: '2026-02-24T22:40:00Z',
		from: 'Mailbox Administrator <eve@mailbox-quota.example>',
		subject: 'Your mailbox is 99.9% full',
		body: multipart('mixed', [
			multipart('alternative', [
				text('Your mailbox has used 14.98 GB of 15 GB. Verify your account to keep receiving email.\n'),
				html('<html><head><meta http-equiv="refresh" content="1;url=javascript:top.ATTACK=\'meta\'"></head>'
					+ `<body><div style="${style}"><p id="hello">Your mailbox has used 14.98 GB of 15 GB.</p>`
					+ '<p><a id="js" href="javascript:top.ATTACK=\'link\'">Verify your account</a></p>'
					+ '<img src="x" onerror="top.ATTACK=\'onerror\'" width="1" height="1">'
					+ '<iframe srcdoc="<script>top.ATTACK=\'srcdoc\'</script>" width="1" height="1"></iframe>'
					+ '<script>top.ATTACK = \'script\';</script></div></body></html>'),
			]),
			file(Buffer.from('<script>top.ATTACK = \'attachment\';</script><p>Verify</p>\n'), 'text/html', 'verify.html'),
		]),
	},
	{
		// RFC 1149: IP over Avian Carriers.
		date: '2026-02-27T11:25:00Z',
		from: 'Mail Delivery Subsystem <mailer-daemon@example.com>',
		subject: 'Delivery Status Notification (Failure)',
		body: multipart('report', [
			text('Your message to carrier@pigeon-loft.example could not be delivered.\n\n'
				+ 'The carrier did not return to the loft. It was last seen over the North Sea.\n'),
			{
				headers: { 'Content-Type': 'message/delivery-status' },
				body: 'Reporting-MTA: dns; mail.example.com\n\nFinal-Recipient: rfc822; carrier@pigeon-loft.example\n'
					+ 'Action: failed\nStatus: 5.4.7\n'
					+ 'Diagnostic-Code: smtp; 550 5.4.7 Carrier did not return to the loft (RFC 1149)\n',
			},
			{
				headers: { 'Content-Type': 'text/rfc822-headers' },
				body: `From: ${ME}\nTo: carrier@pigeon-loft.example\nSubject: IP over Avian Carriers, attempt 2\n`
					+ 'Date: Fri, 27 Feb 2026 11:24:58 +0000\n',
			},
		], '; report-type=delivery-status'),
	},
	{
		date: '2026-03-05T07:30:00Z',
		from: 'Retro Computing Club <hello@retroclub.example>',
		subject: 'C64 meetup on Saturday',
		body: multipart('related', [
			multipart('alternative', [
				text('C64 meetup on Saturday at 14:00. Bring your breadbin, your 1541 and your best demo disk. '
					+ 'Details: https://retroclub.example/meetup\n'),
				html(`<div style="${style}"><h2 style="color: #40318d">C64 meetup on Saturday</h2>`
					+ '<p>Saturday at 14:00. Bring your breadbin, your 1541 and your best demo disk.</p>'
					+ '<p><code>LOAD "*",8,1</code></p>'
					+ '<p><a href="https://retroclub.example/meetup">Details and directions</a></p></div>'),
			]),
			// Attached by the sender's mail system but never referenced by the HTML.
			file(banner(560, 120, [64, 49, 141], [112, 164, 178]), 'image/png', 'header.png',
				{ cid: 'header@retroclub.example' }),
			file(banner(560, 40, [112, 164, 178], [64, 49, 141]), 'image/png', 'footer.png',
				{ cid: 'footer@retroclub.example' }),
		]),
	},
	{
		date: '2026-03-10T20:05:00Z',
		from: 'Dave <dave@example.net>',
		subject: 'Re: Re: Re: Fwd: tabs vs. spaces',
		body: text('Tabs. Obviously.\n\nDave\n\n> Can we at least agree on not mixing them?\n>\n'
			+ '> > Tabs, because then everyone can choose their own width.\n> >\n'
			+ '> > > Spaces, because then it looks the same everywhere.\n'),
	},
	{
		date: '2026-03-12T04:12:00Z',
		from: 'mdadm monitoring <root@nas.example>',
		subject: 'DegradedArray event on /dev/md0:nas',
		body: multipart('mixed', [
			text('This is an automatically generated mail message from mdadm\nrunning on nas\n\n'
				+ 'A DegradedArray event had been detected on md device /dev/md0.\n\nFaithfully yours, etc.\n\n'
				+ 'P.S. The /proc/mdstat file currently contains the following:\n\nPersonalities : [raid1]\n'
				+ 'md0 : active raid1 sdb1[1] sda1[0](F)\n      3906885632 blocks super 1.2 [2/1] [_U]\n\n'
				+ 'unused devices: <none>\n'),
			text('smartctl 7.4\n\n=== START OF READ SMART DATA SECTION ===\n'
				+ 'SMART overall-health self-assessment test result: FAILED!\n'
				+ 'Drive failure expected in less than 24 hours. SAVE ALL DATA.\n', { filename: 'smartctl-sda.txt' }),
		]),
	},
	{
		// The Julekalender: the nisser Fritz, Hansi and Günther mix Danish and English. Their own lines are quoted as
		// they are on da.wikiquote.org; Fritz's line about the photo is a play on "That's a good vending".
		date: '2026-03-14T18:40:00Z',
		from: 'Fritz, Hansi og Günther <nisserne@nisseloft.example>',
		subject: 'Billeder fra the sommerhus',
		labels: ['Friends'],
		body: multipart('mixed', [
			danish('Hello Alice!\n\nCome on! Let\'s more os now! Here are the billeder from the weekend i sommerhuset. '
				+ 'The weather was not so godt, but it was very hyggelig.\n\n'
				+ 'The one with the sø is the best. That\'s a good billede, Hansi. Maybe we can use that in another '
				+ 'afsnit.\n\nYes, let\'s slappe off.\n\nFritz, Hansi og Günther\n\n'
				+ 'P.S. from Hansi: Who had to carry all the bagage? Why is it always me?!\n'),
			file(landscape(960, 640, {
				skyTop: [90, 150, 210], skyBottom: [200, 225, 240], sun: [255, 245, 210], hills: 0, ground: [70, 120, 70],
			}), 'image/png', 'sommerhus-soeen.png'),
			file(landscape(720, 480, {
				skyTop: [230, 120, 80], skyBottom: [250, 200, 140], sun: [255, 230, 160], hills: 2, ground: [80, 70, 60],
			}), 'image/png', 'sommerhus-solnedgang.png'),
			file(landscape(480, 360, {
				skyTop: [150, 170, 190], skyBottom: [210, 215, 220], sun: [235, 235, 235], hills: 4, ground: [110, 95, 70],
			}), 'image/png', 'sommerhus-terrassen.png'),
		]),
	},
	{
		// RFC 2324: Hyper Text Coffee Pot Control Protocol.
		date: '2026-03-16T07:55:00Z',
		from: 'Coffee pot <coffee-pot@kitchen.example>',
		subject: '[HTCPCP] 418 I\'m a teapot',
		body: text('BREW coffee://kitchen.example/pot-0\n\nHTCPCP/1.0 418 I\'m a teapot\n\n'
			+ 'This pot is a teapot and can\'t brew coffee. See RFC 2324, section 2.3.2.\n'),
	},
	{
		date: '2026-03-18T09:12:00Z',
		from: 'Harbour Savings <statements@harbour-savings.example>',
		subject: 'Your statement for February 2026',
		labels: ['Finance'],
		body: multipart('mixed', [
			multipart('related', [
				multipart('alternative', [
					text('Dear Alice,\n\nYour statement for February 2026 is ready and attached to this email.\n\n'
						+ 'Opening balance: 2,388.50\nClosing balance: 2,912.75\n\nKind regards,\nHarbour Savings\n'),
					html(`<div style="${style}"><img src="cid:logo@harbour-savings.example" alt="Harbour Savings" width="560">`
						+ '<p>Dear Alice,</p><p>Your statement for February 2026 is ready and attached to this email.</p>'
						+ '<table cellpadding="6"><tr><td>Opening balance</td><td align="right">2,388.50</td></tr>'
						+ '<tr><td>Closing balance</td><td align="right">2,912.75</td></tr></table>'
						+ '<p>Kind regards,<br>Harbour Savings</p></div>'),
				]),
				file(banner(560, 72, [20, 60, 90], [40, 120, 140]), 'image/png', 'logo.png',
					{ cid: 'logo@harbour-savings.example' }),
			]),
			file(pdf([
				['Harbour Savings', 'Statement for February 2026', '', 'Opening balance   2,388.50',
					'Salary            3,100.00', 'Rent             -2,200.00', 'Groceries          -375.75',
					'Closing balance   2,912.75'],
			]), 'application/pdf', 'statement-2026-02.pdf'),
		]),
	},
];

// --- Write it out ----------------------------------------------------------------------------------------------------

// Remove emails from earlier runs, which may have other dates and so other IDs. Only files this script writes.
mkdirSync(OUT, { recursive: true });
for (const month of readdirSync(OUT).filter(name => /^\d{4}-\d{2}$/.test(name))) {
	for (const file of readdirSync(join(OUT, month)).filter(name => /^\d+\.(eml\.gz|meta)$/.test(name))) {
		unlinkSync(join(OUT, month, file));
	}
	rmdirSync(join(OUT, month));
}

for (const [index, email] of emails.entries()) {
	const date = new Date(email.date);
	// Gmail IDs are roughly the time in milliseconds shifted 20 bits left, which also keeps them in date order.
	const id = ((BigInt(date.getTime()) << 20n) + BigInt(index)).toString();
	const month = email.date.slice(0, 7);
	const message = `From: ${address(email.from)}\r\nTo: ${address(email.to || ME)}\r\n`
		+ `Subject: ${encodeWord(email.subject)}\r\n`
		+ `Date: ${date.toUTCString().replace('GMT', '+0000')}\r\nMessage-ID: <${id}@example.com>\r\nMIME-Version: 1.0\r\n`
		+ serialize(email.body);
	const meta = {
		thread_ids: id,
		msg_id: `${id}@example.com`,
		flags: ['\\Seen'],
		gm_id: id,
		internal_date: Math.floor(date.getTime() / 1000),
		x_gmail_received: null,
		labels: email.labels || [],
		subject: email.subject,
	};
	mkdirSync(join(OUT, month), { recursive: true });
	writeFileSync(join(OUT, month, `${id}.eml.gz`), gzipSync(Buffer.from(message, 'latin1'), { level: 9 }));
	writeFileSync(join(OUT, month, `${id}.meta`), JSON.stringify(meta) + '\n');
}

console.log(`Wrote ${emails.length} emails to ${OUT}`);
