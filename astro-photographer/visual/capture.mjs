// Renders each configured page at each breakpoint and saves a full-page
// screenshot, plus a computed-style audit JSON. Assumes the Astro preview
// server is already running at baseUrl (see `npm run visual`).

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { baseUrl, breakpoints, pages, outDir, auditTargetsByPage } from './config.mjs';

// Full-page screenshots of these tall pages routinely exceed 8000px on an edge,
// which is larger than image tools / viewers accept. We write a downscaled copy
// of every screenshot into out/small/ with the longest edge capped, so the
// render can actually be viewed and compared against the mockup.
const SMALL_MAX_EDGE = 2000;
async function writeSmall(srcPath, smallDir, name) {
  const img = sharp(srcPath);
  const m = await img.metadata();
  const longest = Math.max(m.width, m.height);
  const scale = longest > SMALL_MAX_EDGE ? SMALL_MAX_EDGE / longest : 1;
  const dest = resolve(smallDir, name);
  await img
    .resize({ width: Math.round(m.width * scale), height: Math.round(m.height * scale) })
    .png()
    .toFile(dest);
  return dest;
}

async function auditPage(page, targets) {
  return page.evaluate((targets) => {
    const round = (n) => Math.round(n * 100) / 100;
    const results = [];
    for (const { label, selector } of targets) {
      const el = document.querySelector(selector);
      if (!el) {
        results.push({ label, selector, found: false });
        continue;
      }
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      results.push({
        label,
        selector,
        found: true,
        fontFamily: cs.fontFamily,
        // The first actually-resolved family can't be read directly, but we
        // flag likely fallback by checking if a serif fallback is in use.
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        width: round(rect.width),
        marginLeft: round(rect.left),
        marginRight: round(window.innerWidth - rect.right),
      });
    }
    return results;
  }, targets);
}

async function run() {
  await mkdir(outDir, { recursive: true });
  const smallDir = resolve(outDir, 'small');
  await mkdir(smallDir, { recursive: true });
  const browser = await chromium.launch();
  const summary = {};

  for (const def of pages) {
    summary[def.name] = {};
    for (const [bp, width] of Object.entries(breakpoints)) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      const url = baseUrl + def.route;
      await page.goto(url, { waitUntil: 'networkidle' });
      // Give web fonts a beat to settle so screenshots reflect loaded fonts.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);

      const shotPath = resolve(outDir, `${def.name}-${bp}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      const smallPath = await writeSmall(shotPath, smallDir, `${def.name}-${bp}.png`);

      const targets = auditTargetsByPage[def.name] || [];
      const audit = await auditPage(page, targets);
      summary[def.name][bp] = {
        width,
        screenshot: `${def.name}-${bp}.png`,
        screenshotSmall: `small/${def.name}-${bp}.png`,
        audit,
      };

      console.log(`captured ${def.name} @ ${bp} (${width}px) -> ${shotPath} (small -> ${smallPath})`);
      await context.close();
    }
  }

  await browser.close();
  await writeFile(resolve(outDir, 'audit.json'), JSON.stringify(summary, null, 2));
  console.log(`\naudit written -> ${resolve(outDir, 'audit.json')}`);
  return summary;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
