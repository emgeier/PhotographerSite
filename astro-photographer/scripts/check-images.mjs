#!/usr/bin/env node
// Image-pipeline build assertion (glammuse-design-import task 12.1).
//
// Verifies the built home + portfolio pages were routed through the
// Pic / astro:assets image pipeline (design Property 3, Requirements 10.1 & 10.2):
//   - each page MUST contain at least one `<source type="image/avif">`
//     (astro:assets <picture> output), and
//   - each page MUST NOT contain any bare `<img src="....webp">`
//     (an un-optimized raw .webp referenced directly in an <img src>).
//
// This script assumes `dist/` already exists. Run `astro build` first
// (e.g. `npm run build && npm run check:images`). If `dist/` or either
// HTML file is missing, the script exits non-zero with a clear message.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const PAGES = [
  { label: 'home', file: join(distDir, 'index.html') },
  { label: 'portfolio', file: join(distDir, 'portfolio', 'index.html') },
];

// astro:assets emits AVIF as `<source type="image/avif" ...>`.
const AVIF_SOURCE = /<source[^>]*\btype=["']image\/avif["'][^>]*>/i;
// A bare, un-optimized webp referenced directly in an <img src="....webp">.
// Matches both `.webp` and `.webp?...` querystrings.
const BARE_WEBP_IMG = /<img\b[^>]*\bsrc=["'][^"']+\.webp(?:[?#][^"']*)?["'][^>]*>/gi;

function fail(message) {
  console.error(`\u2717 check:images FAILED\n  ${message}`);
  process.exit(1);
}

if (!existsSync(distDir)) {
  fail(`dist/ not found at ${distDir}. Run \`npm run build\` (astro build) before \`npm run check:images\`.`);
}

const failures = [];
const summary = [];

for (const { label, file } of PAGES) {
  if (!existsSync(file)) {
    failures.push(`${label}: expected built file not found at ${file}. Did \`astro build\` complete?`);
    continue;
  }

  const html = await readFile(file, 'utf8');

  const hasAvifSource = AVIF_SOURCE.test(html);
  const bareWebpMatches = html.match(BARE_WEBP_IMG) ?? [];

  if (!hasAvifSource) {
    failures.push(`${label} (${file}): no \`<source type="image/avif">\` found \u2014 images did not go through astro:assets.`);
  }
  if (bareWebpMatches.length > 0) {
    const sample = bareWebpMatches.slice(0, 3).join('\n      ');
    failures.push(
      `${label} (${file}): found ${bareWebpMatches.length} bare \`<img src="....webp">\` element(s) \u2014 un-optimized raster(s):\n      ${sample}`
    );
  }

  summary.push(
    `  \u2022 ${label}: avif <source> present=${hasAvifSource}, bare .webp <img>=${bareWebpMatches.length}`
  );
}

if (failures.length > 0) {
  fail(failures.join('\n  '));
}

console.log('\u2713 check:images PASSED \u2014 home + portfolio went through the astro:assets image pipeline');
console.log('  (Property 3 / Requirements 10.1, 10.2)');
console.log(summary.join('\n'));
