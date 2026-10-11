# Image optimization (Track 1 — static site images)

Static, non-CMS images (hero, portfolio, experience, contact — everything that
is fixed and lives in the page markup, not the Muse content collection) are
optimized at **build time** by Astro's `astro:assets` pipeline via the `Pic`
component (`src/components/Pic.astro`).

Each imported raster image becomes a `<picture>` with **AVIF + WebP** at several
widths plus a `srcset`, so every device downloads the smallest sufficient file.
Dimensions are baked in (no layout shift), filenames are content-hashed (safe to
cache forever on CloudFront), and originals never ship.

> The growing **Muse story photos** are a separate track (originals in the S3
> media bucket, resized on the fly through CloudFront). This doc is only about
> the fixed site images.

## Where images live

- Optimized images: **`src/assets/images/`** (imported in page frontmatter).
- Not `public/images/`: anything in `public/` is copied verbatim with **no**
  optimization. Only files under `src/` go through the pipeline.

Current contents are **PNG placeholders**. They are PNG, not SVG, on purpose:
in Astro 7 an imported `.svg` is an SVG *component* (a function), not image
metadata, so it cannot feed `<Picture>`. PNG placeholders behave exactly like
the real photos will, so what you test now is what you ship.

## Using the `Pic` component

```astro
---
import Pic from '../components/Pic.astro';
import hero from '../assets/images/hero.png';
---
<Pic src={hero} alt="Hero portrait" priority sizes="(max-width: 700px) 100vw, 60vw" />
```

Props:
- `src` — an imported asset (optimized) **or** a plain string URL (passed through
  as a bare `<img>`, e.g. a CMS/CloudFront URL).
- `alt` — required.
- `priority` — set on the **one** above-the-fold LCP image per page. It renders
  `loading=eager` + `fetchpriority=high`. Everything else defaults to
  `loading=lazy` + `decoding=async`.
- `sizes` — the CSS width the image occupies at each breakpoint. Match it to the
  layout so the browser picks the right `srcset` entry. Default assumes a content
  column; override per use (hero ≈ 60vw, story card ≈ 33vw, full-bleed = 100vw).
- `widths` — defaults to `[480,768,1024,1440,1920,2560]`, auto-capped at the
  source width (never upscales).

## Adding a real photo (replacing a placeholder)

1. Drop the real file into `src/assets/images/`, e.g. `hero.jpg`.
2. Update the import in the page to the new extension:
   `import hero from '../assets/images/hero.jpg';`
3. Delete the old `hero.png` placeholder.
4. `npm run build` — the `<picture>` now serves AVIF/WebP derivatives of the real
   photo. No markup change needed.

Use the **highest-resolution original** you have (up to ~2560px on the long edge
is plenty for web; the pipeline downsizes, it never upsizes). JPEG or PNG in,
AVIF/WebP out.

## Converting the remaining pages

Only `index.astro` is converted so far (reference implementation). The other
pages still use raw `<img src="/images/*.svg">`. To convert each
(`portfolio.astro`, `experience.astro`, `contact.astro`, `stories.astro`, and the
non-CMS images in `stories/[slug].astro`):

1. For each image, add a PNG/JPG to `src/assets/images/` (convert the existing
   placeholder, or drop the real photo).
2. `import name from '../assets/images/<name>.png';` in the frontmatter.
3. Replace `<img src="/images/<name>.svg" ... />` with
   `<Pic src={name} alt="..." sizes="..." />`.
4. Mark the page's hero (first, above-the-fold image) with `priority`.
5. Leave genuinely dynamic CMS images (`src={muse.cardImage}` etc.) as-is for now
   — those belong to the media-bucket track; `Pic` passes string URLs through
   unchanged, so you can still route them through `Pic` later without breakage.

## Verifying

```bash
npm run build
grep -c '<picture' dist/index.html                 # > 0 means optimization ran
grep -oE 'type="image/(avif|webp)"' dist/index.html # confirms modern formats
ls dist/_astro | grep -E '\.(avif|webp)$'           # emitted derivatives
```
