// Generates placeholder SVGs for the Portfolio page in the correct aspect ratios.
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
await mkdir(dir, { recursive: true });

function svg(w, h, label, tone = 0) {
  const bgs = ['#D7CEC4', '#CFC6BB', '#C7BDB1'];
  const bg = bgs[tone % bgs.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/><circle cx="${w/2}" cy="${h*0.42}" r="${Math.min(w,h)*0.22}" fill="#A99888" opacity=".5"/><path d="M${w*0.18} ${h}c${w*0.05}-${h*0.3} ${w*0.18}-${h*0.45} ${w*0.32}-${h*0.45}s${w*0.27} ${h*0.15} ${w*0.32} ${h*0.45}" fill="#B89C74" opacity=".45"/><text x="${w/2}" y="${h*0.86}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(Math.min(w,h)*0.045)}" letter-spacing="4" fill="#171717">${label}</text></svg>`;
}

// Dark full-bleed placeholder (near-black fabric look) for dark bands where a
// light placeholder would wash out under the page's dark overlay.
function darkSvg(w, h, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2420"/><stop offset="0.5" stop-color="#1d1a16"/><stop offset="1" stop-color="#120f0d"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><ellipse cx="${w*0.4}" cy="${h*0.42}" rx="${w*0.4}" ry="${h*0.5}" fill="#3a322b" opacity=".4"/><text x="${w/2}" y="${h*0.52}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(Math.min(w,h)*0.045)}" letter-spacing="6" fill="#6b6158">${label}</text></svg>`;
}

const files = {
  // portfolio hero portrait (tall, bleeds top-right)
  'pf-hero.svg': svg(900, 1100, 'HERO PORTRAIT', 0),
  // 3x3 grid, square-ish portraits
  'pf-grid-1.svg': svg(600, 640, 'PORTRAIT 1', 0),
  'pf-grid-2.svg': svg(600, 640, 'PORTRAIT 2', 1),
  'pf-grid-3.svg': svg(600, 640, 'PORTRAIT 3', 2),
  'pf-grid-4.svg': svg(600, 640, 'PORTRAIT 4', 2),
  'pf-grid-5.svg': svg(600, 640, 'PORTRAIT 5', 0),
  'pf-grid-6.svg': svg(600, 640, 'PORTRAIT 6', 1),
  'pf-grid-7.svg': svg(600, 640, 'PORTRAIT 7', 1),
  'pf-grid-8.svg': svg(600, 640, 'PORTRAIT 8', 2),
  'pf-grid-9.svg': svg(600, 640, 'PORTRAIT 9', 0),
  // full-bleed landscape band
  'pf-band.svg': svg(1440, 520, 'FULL-BLEED LANDSCAPE', 2),
  // experience video thumbnail (landscape)
  'pf-video.svg': svg(820, 560, 'VIDEO THUMBNAIL', 1),
  // final CTA portrait (right)
  'pf-cta.svg': svg(760, 760, 'CTA PORTRAIT', 0),

  // --- Experience page ---
  // experience hero portrait (tall)
  'ex-hero.svg': svg(900, 1180, 'EXPERIENCE HERO', 0),
  // process steps (roughly square / slightly tall)
  'ex-process-1.svg': svg(640, 720, 'PROCESS 1', 0),
  'ex-process-2.svg': svg(640, 720, 'PROCESS 2', 1),
  'ex-process-3.svg': svg(640, 720, 'PROCESS 3', 2),
  // inside gallery (landscape-ish, equal width)
  'ex-inside-1.svg': svg(760, 560, 'INSIDE 1', 1),
  'ex-inside-2.svg': svg(760, 560, 'INSIDE 2', 2),
  'ex-inside-3.svg': svg(760, 560, 'INSIDE 3', 0),
  'ex-inside-4.svg': svg(760, 560, 'INSIDE 4', 1),

  // --- Home page: "Not transformed, revealed." band ---
  // full-bleed DARK landscape behind the experience band text (dark so the
  // page's own dark overlay keeps the light text readable)
  'exp-band.svg': darkSvg(1600, 760, 'EXPERIENCE BAND'),

  // --- Muse Stories page ---
  // hero portrait (tall, bleeds top-right)
  'ms-hero.svg': svg(900, 1080, 'MUSE STORIES HERO', 0),
  // featured muse portrait (large, left of featured band)
  'ms-featured.svg': svg(900, 760, 'HEATHER FEATURED', 1),
  // meet-the-muses grid, 6 square-ish portraits
  'ms-muse-1.svg': svg(600, 560, 'HEATHER', 0),
  'ms-muse-2.svg': svg(600, 560, 'LAUREN', 1),
  'ms-muse-3.svg': svg(600, 560, 'KAYLEE', 2),
  'ms-muse-4.svg': svg(600, 560, 'RENEE', 2),
  'ms-muse-5.svg': svg(600, 560, 'JASMINE', 0),
  'ms-muse-6.svg': svg(600, 560, 'ELISE', 1),
  // "Look Again." dark band portrait (landscape, dark)
  'ms-look-again.svg': darkSvg(1600, 540, 'LOOK AGAIN'),
  // "In Motion." dark band video thumbnail (landscape, dark)
  'ms-motion.svg': darkSvg(1600, 520, 'IN MOTION'),
  // final CTA portrait (tall, bleeds in from left)
  'ms-cta.svg': svg(760, 820, 'YOUR STORY'),

  // --- Individual Story page ---
  // dark hero portrait (large, bleeds to top-right of dark hero)
  'st-hero.svg': darkSvg(1040, 900, 'HERO PORTRAIT'),
  // mosaic gallery, mixed aspect ratios (portrait / landscape / square)
  'st-gallery-1.svg': svg(600, 900, 'PORTRAIT 1', 0),
  'st-gallery-2.svg': svg(560, 720, 'PORTRAIT 2', 1),
  'st-gallery-3.svg': svg(560, 480, 'PORTRAIT 3', 2),
  'st-gallery-4.svg': svg(640, 460, 'PORTRAIT 4', 0),
  'st-gallery-5.svg': svg(420, 520, 'PORTRAIT 5', 1),
  'st-gallery-6.svg': svg(560, 560, 'PORTRAIT 6', 2),
  'st-gallery-7.svg': svg(560, 620, 'PORTRAIT 7', 1),
  'st-gallery-8.svg': svg(420, 620, 'PORTRAIT 8', 0),
  'st-gallery-9.svg': svg(480, 620, 'PORTRAIT 9', 2),
  'st-gallery-10.svg': svg(560, 620, 'PORTRAIT 10', 1),
  // before / after pair (roughly square)
  'st-before.svg': svg(620, 680, 'BEFORE', 1),
  'st-after.svg': svg(620, 680, 'AFTER', 0),
  // dark cinematic video still (landscape, dark)
  'st-motion.svg': darkSvg(1600, 520, 'IN MOTION'),

  // --- Contact page ---
  // tall hero portrait (bleeds in from the right of the ivory hero)
  'ct-hero.svg': svg(900, 1150, 'CONTACT HERO', 0),
  // tall B&W-ish portrait (left of the form band; grayscale applied in CSS)
  'ct-about.svg': svg(760, 1040, 'EVERY WOMAN', 1),
  // dark fabric behind the "A Simple Beginning" ink step band
  'ct-steps-band.svg': darkSvg(1600, 620, 'A SIMPLE BEGINNING'),
  // wide portrait bleeding in from the right of the closing ivory band
  'ct-close.svg': svg(1100, 620, 'YOU IN FULL', 0),
};

for (const [name, content] of Object.entries(files)) {
  await writeFile(resolve(dir, name), content);
}
console.log('wrote', Object.keys(files).length, 'placeholder SVGs to public/images/');
