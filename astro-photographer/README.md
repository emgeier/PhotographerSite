# The Glam Muse Series — Astro homepage prototype

Static Astro implementation of the supplied homepage design, prepared for GitHub + Cloudflare Pages.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Set `PUBLIC_ADOBE_FONTS_PROJECT` to the photographer's Adobe Fonts Web Project ID containing IvyPresto Display. The CSS expects Adobe's family name `ivypresto-display`. Manrope is bundled locally through `@fontsource-variable/manrope`.

## Production build

```bash
npm run build
```

Cloudflare Pages settings:
- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `PUBLIC_ADOBE_FONTS_PROJECT=<Adobe project ID>`

## Photography placeholders

Replace files in `public/images/` or update the paths in `src/pages/index.astro`. For production, use properly sized AVIF/WebP/JPEG derivatives rather than camera originals.

## Palette

- Ivory `#F4F0E8`
- Ink `#171717`
- Gold `#B89C74`
- Stone `#D7CEC4`
- Taupe `#A99888`
- Soft white `#FAF9F6`
