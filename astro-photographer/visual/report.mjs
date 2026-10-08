// Builds a single self-contained HTML report placing each rendered screenshot
// next to its mockup PNG, plus a table of the computed-style audit so font and
// margin mismatches are explicit, not guessed.

import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { outDir, websiteRoot, pages, breakpoints } from './config.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function main() {
  const audit = JSON.parse(await readFile(resolve(outDir, 'audit.json'), 'utf8'));
  const assetsDir = resolve(outDir, 'mockups');
  await mkdir(assetsDir, { recursive: true });

  let body = `<h1>Visual comparison — render vs mockup</h1>
  <p class="note">Left: your Astro render. Right: the ChatGPT mockup PNG. Both are scaled to the same column width so you compare proportion, not raw pixels. Photos differ by design (SVG placeholders vs AI portraits) — focus on type, spacing, and layout.</p>`;

  for (const def of pages) {
    body += `<h2>${esc(def.name)} <span class="route">${esc(def.route)}</span></h2>`;
    for (const bp of Object.keys(breakpoints)) {
      const entry = audit[def.name]?.[bp];
      if (!entry) continue;
      const mockupSrc = def.mockups[bp];
      let mockupRel = '';
      if (mockupSrc) {
        const abs = resolve(websiteRoot, '..', mockupSrc);
        const dest = resolve(assetsDir, `${def.name}-${bp}-mockup.png`);
        try {
          await copyFile(abs, dest);
          mockupRel = `mockups/${basename(dest)}`;
        } catch {
          mockupRel = '';
        }
      }

      body += `<section>
        <h3>${esc(bp)} <span class="w">rendered @ ${entry.width}px</span></h3>
        <div class="pair">
          <figure><figcaption>Render</figcaption><img src="${entry.screenshot}" /></figure>
          <figure><figcaption>Mockup</figcaption>${mockupRel ? `<img src="${mockupRel}" />` : '<p class="missing">no mockup</p>'}</figure>
        </div>`;

      // audit table (only once per page, from desktop, to keep it focused)
      if (bp === 'desktop') {
        body += `<table><thead><tr>
          <th>Element</th><th>font-size</th><th>weight</th><th>line-height</th><th>letter-spacing</th><th>font-family (resolved)</th><th>width</th><th>L / R margin</th>
          </tr></thead><tbody>`;
        for (const a of entry.audit) {
          if (!a.found) {
            body += `<tr class="missing-row"><td>${esc(a.label)}</td><td colspan="7">not found: ${esc(a.selector)}</td></tr>`;
            continue;
          }
          const serifFallback = /georgia|times|serif/i.test(a.fontFamily) && !/ivypresto/i.test(a.fontFamily);
          body += `<tr>
            <td>${esc(a.label)}</td>
            <td>${esc(a.fontSize)}</td>
            <td>${esc(a.fontWeight)}</td>
            <td>${esc(a.lineHeight)}</td>
            <td>${esc(a.letterSpacing)}</td>
            <td class="${serifFallback ? 'warn' : ''}">${esc(a.fontFamily)}</td>
            <td>${esc(a.width)}px</td>
            <td>${esc(a.marginLeft)} / ${esc(a.marginRight)}</td>
          </tr>`;
        }
        body += `</tbody></table>`;
      }
      body += `</section>`;
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Visual comparison</title>
  <style>
    body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:32px;background:#f6f6f4;color:#1a1a1a}
    h1{font-size:22px} h2{margin-top:40px;border-top:2px solid #ddd;padding-top:20px} .route,.w{color:#888;font-weight:400;font-size:13px}
    .note{color:#555;max-width:760px}
    .pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
    figure{margin:0} figcaption{font-size:12px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em}
    .pair img{width:100%;border:1px solid #ccc;background:#fff}
    table{border-collapse:collapse;width:100%;margin-top:18px;background:#fff;font-size:12.5px}
    th,td{border:1px solid #e2e2e2;padding:6px 8px;text-align:left} th{background:#efece6}
    td.warn{background:#ffe9e0;color:#b23b00;font-weight:600}
    .missing{color:#b00} .missing-row td{color:#b00}
  </style></head><body>${body}</body></html>`;

  const dest = resolve(outDir, 'index.html');
  await writeFile(dest, html);
  console.log(`report written -> ${dest}`);
  console.log('open it with:  open ' + dest);
}

main().catch((e) => { console.error(e); process.exit(1); });
