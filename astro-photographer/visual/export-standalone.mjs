// Assembles a single self-contained HTML file from the Astro build:
// - inlines the built CSS into a <style> tag
// - keeps the Adobe Typekit <link> (must stay external, Adobe-hosted)
// - rewrites absolute "/images/..." refs to relative "images/..."
// Output: export/index.html + export/images/*  (portable folder)

import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dist = resolve(projectRoot, 'dist');
const outDir = resolve(projectRoot, 'export');

let html = await readFile(resolve(dist, 'index.html'), 'utf8');

// find the built css path
const cssMatch = html.match(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)">/);
if (!cssMatch) throw new Error('could not find built CSS link in dist/index.html');
const css = await readFile(resolve(dist, cssMatch[1].replace(/^\//, '')), 'utf8');

// remove the external built-css link, inline it as <style> before </head>
html = html.replace(cssMatch[0], '');
html = html.replace('</head>', `<style>\n${css}\n</style></head>`);

// make image paths relative so the folder is portable
html = html.replace(/(src|href)="\/images\//g, '$1="images/');

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'index.html'), html);

// copy images
const imgSrc = resolve(dist, 'images');
const imgDst = resolve(outDir, 'images');
await mkdir(imgDst, { recursive: true });
for (const f of await readdir(imgSrc)) await copyFile(resolve(imgSrc, f), resolve(imgDst, f));

console.log('standalone export written -> export/index.html');
console.log('images copied -> export/images/');
console.log('note: Adobe Typekit CSS stays linked (requires internet / the kit on the domain).');
