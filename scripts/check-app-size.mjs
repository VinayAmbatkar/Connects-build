#!/usr/bin/env node
/**
 * Fail if any build artifact exceeds the max size (default 30 MB).
 *
 * Usage:
 *   node scripts/check-app-size.mjs path/to/app.apk
 *   node scripts/check-app-size.mjs path/to/app.aab path/to/app.ipa
 *   npm run check:size -- ./artifacts/app-release.apk
 *
 * Env:
 *   MAX_APP_SIZE_MB=30
 */

import fs from 'fs';
import path from 'path';

const MAX_MB = Number(process.env.MAX_APP_SIZE_MB || 30);
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_EXT = new Set(['.apk', '.aab', '.ipa']);

const inputs = process.argv.slice(2).filter(Boolean);

if (inputs.length === 0) {
  console.error('Usage: node scripts/check-app-size.mjs <artifact.apk|aab|ipa> [...]');
  console.error(`Max allowed size: ${MAX_MB} MB (set MAX_APP_SIZE_MB to change)`);
  process.exit(1);
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}

let failed = false;

for (const input of inputs) {
  const filePath = path.resolve(input);
  const ext = path.extname(filePath).toLowerCase();

  if (!ALLOWED_EXT.has(ext)) {
    console.error(`✗ Skip/reject unsupported type: ${filePath}`);
    console.error(`  Allowed: ${[...ALLOWED_EXT].join(', ')}`);
    failed = true;
    continue;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`✗ File not found: ${filePath}`);
    failed = true;
    continue;
  }

  const { size } = fs.statSync(filePath);
  const ok = size <= MAX_BYTES;
  const label = ok ? '✓' : '✗';

  console.log(`${label} ${path.basename(filePath)}`);
  console.log(`  Path: ${filePath}`);
  console.log(`  Size: ${formatBytes(size)}`);
  console.log(`  Limit: ${MAX_MB} MB`);

  if (!ok) {
    failed = true;
    console.error(
      `  FAIL: exceeds ${MAX_MB} MB by ${formatBytes(size - MAX_BYTES)}`,
    );
  }
}

if (failed) {
  console.error('\nApp size check failed.');
  process.exit(1);
}

console.log(`\nAll artifacts are within ${MAX_MB} MB.`);
