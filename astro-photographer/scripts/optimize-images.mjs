#!/usr/bin/env node
// Optimize the raster images under public/images/ IN PLACE, with a one-time
// backup of the originals.
//
// Why this exists: images imported from src/assets/ go through Astro's
// <Picture> pipeline (auto AVIF/WebP + responsive srcset) and are already
// optimal. Images in public/images/ — everything the CMS uploads, plus the
// hero/banner CMS images — are served exactly as uploaded, so a 4 MB camera
// export stays 4 MB for every visitor. This script resizes + re-encodes those
// files so the site stays fast without changing any filenames (references in
// code/content use exact paths, so the extension must not change).
//
// Behavior:
//   - Scans public/images/ for .jpg/.jpeg/.png/.webp (SVGs and non-images are
//     skipped; vector logos must not be rasterized).
//   - Processes a file only when it is worth it: larger than --threshold bytes
//     OR wider/taller than --max-dim pixels. Already-small files are left alone.
//   - Resizes so the long edge is at most --max-dim (default 2000px), never
//     upscaling, and re-encodes at --quality (default 80), KEEPING the original
//     format and filename (jpg stays jpg, png stays png, webp stays webp).
//   - Backs up each original to public/images-original-backup/<same path> the
//     first time it touches it (idempotent: an existing backup is never
//     overwritten, so re-running optimizes already-optimized output harmlessly).
//   - Only writes the optimized file back when it is actually smaller.
//
// Flags:
//   --dry-run        report what would change, write nothing.
//   --max-dim=2000   max long-edge in pixels.
//   --quality=80     encoder quality (jpeg/webp) / effort baseline.
//   --threshold=400  size floor in KB; files at/under this AND within max-dim
//                    are skipped.
//
// Usage:  npm run optimize:images            (convert in place, with backup)
//         npm run optimize:images -- --dry-run
//
// Restore: copy files back from public/images-original-backup/ (see aws/README
// or GUIA-CMS). The backup folder is git-ignored so originals never bloat the
// repo or ship to the site bucket.

import { readdir, stat, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, extname } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'public', 'images');
const BACKUP_DIR = join(__dirname, '..', 'public', 'images-original-backup');

// --- args -------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const DRY_RUN = args.includes('--dry-run');
// Gallery / grid photos: 2000px is plenty (they display small; the lightbox
// rarely exceeds ~1500px wide). Full-bleed hero/banner/CTA images fill large
// retina screens, so they get a larger cap for richness.
const MAX_DIM = Number(flag('max-dim', '2000'));
const HERO_MAX_DIM = Number(flag('hero-max-dim', '2560'));
// Photographer-grade quality: higher than a generic web default so skin tones,
// gradients, and fabric stay rich. Costs modest extra bytes.
const QUALITY = Number(flag('quality', '86'));
const THRESHOLD_BYTES = Number(flag('threshold', '400')) * 1024;

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Filenames that are full-bleed background images get the larger (HERO) cap.
// Matched case-insensitively against the path relative to public/images.
const HERO_PATTERNS = [
  /hero/i,
  /banner/i,
  /\bcta\b/i,
  /closing/i,
  /philosophy/i,
  /landing/i,
  /-bg\b/i,
  /background/i,
];
const isHero = (rel) => HERO_PATTERNS.some((re) => re.test(rel));

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/** Recursively collect raster files under dir, excluding the backup folder. */
async function collect(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === BACKUP_DIR) continue; // never re-process backups
      await collect(full, out);
    } else if (RASTER.has(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/** Re-encode a sharp pipeline in the file's own format at QUALITY. */
function encode(pipeline, ext) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    case '.png':
      // Photographic PNGs: palette+compression. Keeps it lossless-ish; big
      // flat logos are usually small and skipped by the size gate anyway.
      return pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
    case '.webp':
      return pipeline.webp({ quality: QUALITY }).toBuffer();
    default:
      return null;
  }
}

async function run() {
  if (!existsSync(IMAGES_DIR)) {
    console.error(`\u2717 optimize:images: ${IMAGES_DIR} not found.`);
    process.exit(1);
  }

  const files = await collect(IMAGES_DIR);
  let processed = 0;
  let skipped = 0;
  let before = 0;
  let after = 0;
  const rows = [];

  for (const file of files) {
    const rel = relative(IMAGES_DIR, file);
    const ext = extname(file).toLowerCase();
    const origSize = (await stat(file)).size;

    let meta;
    try {
      meta = await sharp(file).metadata();
    } catch {
      rows.push(`  skip (unreadable): ${rel}`);
      skipped += 1;
      continue;
    }

    const cap = isHero(rel) ? HERO_MAX_DIM : MAX_DIM;
    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    const worthIt = origSize > THRESHOLD_BYTES || longEdge > cap;
    if (!worthIt) {
      skipped += 1;
      continue;
    }

    // Resize only when larger than this file's cap; never upscale.
    let pipeline = sharp(file).rotate(); // rotate() bakes EXIF orientation
    if (longEdge > cap) {
      pipeline = pipeline.resize({
        width: meta.width >= meta.height ? cap : undefined,
        height: meta.height > meta.width ? cap : undefined,
        withoutEnlargement: true,
      });
    }

    let outBuf;
    try {
      outBuf = await encode(pipeline, ext);
    } catch (e) {
      rows.push(`  skip (encode failed): ${rel} \u2014 ${e.message}`);
      skipped += 1;
      continue;
    }
    if (!outBuf) {
      skipped += 1;
      continue;
    }

    // Only keep the result if it is actually smaller.
    if (outBuf.length >= origSize) {
      rows.push(`  keep original (already optimal): ${rel} (${kb(origSize)})`);
      skipped += 1;
      continue;
    }

    before += origSize;
    after += outBuf.length;
    processed += 1;
    const saved = (((origSize - outBuf.length) / origSize) * 100).toFixed(0);
    rows.push(
      `  ${DRY_RUN ? 'would optimize' : 'optimized'}: ${rel}  ${kb(origSize)} \u2192 ${kb(outBuf.length)}  (-${saved}%)`,
    );

    if (DRY_RUN) continue;

    // One-time backup of the original (never overwrite an existing backup).
    const backupPath = join(BACKUP_DIR, rel);
    if (!existsSync(backupPath)) {
      await mkdir(dirname(backupPath), { recursive: true });
      await copyFile(file, backupPath);
    }

    await writeFile(file, outBuf);
  }

  console.log(rows.join('\n'));
  console.log('\n' + '-'.repeat(56));
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}${processed} optimized, ${skipped} skipped, ${files.length} scanned`,
  );
  if (processed > 0) {
    const savedPct = (((before - after) / before) * 100).toFixed(0);
    console.log(`total: ${kb(before)} \u2192 ${kb(after)}  (saved ${kb(before - after)}, -${savedPct}%)`);
  }
  if (!DRY_RUN && processed > 0) {
    console.log(`originals backed up under public/images-original-backup/`);
  }
}

run().catch((e) => {
  console.error('\u2717 optimize:images error:', e);
  process.exit(1);
});
