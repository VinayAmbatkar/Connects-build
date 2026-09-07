#!/usr/bin/env node
/**
 * Early warning: export JS bundles and fail if the largest platform
 * export folder exceeds MAX_BUNDLE_SIZE_MB (default 12 MB).
 * This is NOT the installable APK/IPA size — use check-app-size.mjs for that.
 *
 * Usage:
 *   npm run check:bundle-size
 *
 * Env:
 *   MAX_BUNDLE_SIZE_MB=12
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MAX_MB = Number(process.env.MAX_BUNDLE_SIZE_MB || 12);
const MAX_BYTES = MAX_MB * 1024 * 1024;
const OUT_DIR = path.join(process.cwd(), 'dist-size-check');

function dirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}

console.log('Exporting bundles for size check...');
const exportResult = spawnSync(
  'npx',
  ['expo', 'export', '--output-dir', OUT_DIR, '--platform', 'all'],
  { stdio: 'inherit', shell: true },
);

if (exportResult.status !== 0) {
  console.error('expo export failed — cannot measure bundle size.');
  process.exit(exportResult.status || 1);
}

const total = dirSize(OUT_DIR);
const ok = total <= MAX_BYTES;

console.log(`\nExport output: ${OUT_DIR}`);
console.log(`Total size: ${formatBytes(total)}`);
console.log(`Limit: ${MAX_MB} MB (JS export early warning)`);

try {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
} catch {
  // ignore cleanup errors
}

if (!ok) {
  console.error(
    `\nFAIL: export exceeds ${MAX_MB} MB. Trim assets/fonts or check imports.`,
  );
  process.exit(1);
}

console.log('\nBundle size early check passed.');
