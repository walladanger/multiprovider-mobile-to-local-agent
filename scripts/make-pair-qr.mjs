#!/usr/bin/env node
// Prints a universal pairing QR (see docs/pairing.md) in the terminal.
//
//   PAIR_CODE=<code> node scripts/make-pair-qr.mjs --type opencode --url http://192.168.1.5:4096
//   node scripts/make-pair-qr.mjs --type comfyui --url http://192.168.1.5:8188 [--https] [--host h]
//
// Secrets: the one-time code is read from PAIR_CODE (never argv) and is never
// printed as text; only the type and server hosts are echoed.
import QRCode from 'qrcode';

const TYPES = ['opencode', 'models', 'invoke', 'comfyui'];
const args = process.argv.slice(2);
const urls = [];
let type = 'opencode';
let https = false;
let host = process.env.EXPO_PAIRING_HOST || 'opencode.8466crosstimbers.com';

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--type') type = args[++i];
  else if (arg === '--url') urls.push(args[++i]);
  else if (arg === '--https') https = true;
  else if (arg === '--host') host = args[++i];
  else if (arg === '--code') fail('Pass the code via the PAIR_CODE environment variable, not on the command line.');
  else if (arg === '-h' || arg === '--help') {
    console.log('Usage: PAIR_CODE=<code> node scripts/make-pair-qr.mjs --type opencode|models|invoke|comfyui --url <server url> [--url ...] [--https] [--host <host>]');
    process.exit(0);
  } else fail(`Unknown argument: ${arg}`);
}

if (!TYPES.includes(type)) fail(`--type must be one of ${TYPES.join(', ')}`);
if (!urls.length) fail('At least one --url is required.');
for (const u of urls) {
  let parsed;
  try { parsed = new URL(u); } catch { fail(`Invalid --url: ${u}`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) fail('--url must be http(s).');
  if (parsed.username || parsed.password) fail('--url must not contain credentials.');
}

const code = process.env.PAIR_CODE?.trim();
if (type === 'opencode' && !code) fail('opencode pairing needs a one-time code in PAIR_CODE (from `opencode pair`).');
if (code && !/^[A-Za-z0-9_-]{1,256}$/.test(code)) fail('PAIR_CODE has an invalid format.');

const enc = encodeURIComponent;
const parts = ['v=1', `type=${enc(type)}`, ...urls.map((u) => `url=${enc(u)}`), ...(code ? [`code=${enc(code)}`] : [])];
const base = https ? `https://${host}/connect` : 'opencodemobile://connect';
const link = `${base}?${parts.join('&')}`;

const qr = await QRCode.toString(link, { type: 'terminal', small: true, errorCorrectionLevel: 'M' });
console.log(qr);
console.log(`Type: ${type}`);
console.log(`Servers: ${urls.map((u) => new URL(u).host).join(', ')}`);
console.log(`Form: ${https ? `https://${host}/connect` : 'opencodemobile://connect'}${code ? ' (includes a one-time code; do not share this QR)' : ''}`);
