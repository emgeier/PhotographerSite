# Design Document: glammuse-design-import

## Overview

Port the Codex static site's visual design (`index.html`, `portfolio.html` + their CSS/JS) into the existing Astro site as `.astro` components, so the Codex look wins for **home + portfolio only**, while every Astro platform capability — the muses content collection, Sveltia CMS, `Pic.astro`/`astro:assets` pipeline, the real ActiveCampaign contact Lambda, the CloudFormation stack, and the GitHub Actions deploy — survives untouched. `experience`, `stories`, and `contact` keep their current Astro design; a shared `Header`/`Footer`/token layer bridges the resulting visual-consistency gap.

This is Code-First. Every decision below is a concrete file, signature, or snippet grounded in the real source I read.

---

## Architecture

### Main Workflow

```mermaid
sequenceDiagram
    participant Dev as Author/Dev
    participant Astro as Astro build (static)
    participant Pic as Pic.astro → astro:assets
    participant GSAP as motion/*.ts (client)
    participant AC as AC Lambda (API GW)

    Dev->>Astro: edit index.astro / portfolio.astro (Codex markup)
    Astro->>Pic: import src/assets/images/*.webp
    Pic-->>Astro: <picture> AVIF/WebP + srcset (display:contents)
    Astro-->>Dev: dist/ static HTML with baked dimensions
    Note over GSAP: hydrate on load; respect prefers-reduced-motion
    GSAP->>GSAP: initMotion() reveal/parallax/hero
    GSAP->>GSAP: initPortfolio() lightbox + experience video
    Dev->>AC: contact form POST (JSON) — real backend wins
    AC-->>Dev: {ok:true} ; no-JS native POST fallback (?sent=1)
```

---

### Decision Summary (the tradeoffs, resolved)

| # | Topic | Decision |
|---|-------|----------|
| D1 | Strategy | Port Codex HTML→`.astro`, CSS→scoped page stylesheets, JS→client `.ts` modules. Do **not** replace Astro with static files. |
| D2 | Scope | Only `index.astro` + `portfolio.astro` adopt the Codex look. `experience/stories/contact` unchanged. |
| D3 | Tokens | **One** token system: extend Astro `:root` with Codex aliases (`--black`→`--ink`, `--champagne`→`--gold`, add `--serif/--sans/--content-width`). Codex values win for home+portfolio surfaces. |
| D4 | Fonts | Keep `@fontsource-variable/manrope` (npm, self-hosted) for `--sans`. Keep Astro's Typekit `mdr5myc` for ivypresto-display. Drop Codex kit `dis2zlj` and the local Cormorant fallback (redundant). |
| D5 | Motion | Vendor-free: install `gsap` via npm, author `src/scripts/motion.ts` + `portfolio.ts`, load with Astro `<script>` (bundled, deferred). CONFIG preserved. |
| D6 | Images | Route all Codex `.webp` through `Pic.astro`. Keep `picture{display:contents}`. Portfolio 9-up grid is **page-local data in the component** (not CMS) — it is marketing art direction, not muse content. |
| D7 | Contact | **AC Lambda wins.** Codex consultation `<dialog>` + mailto is dropped. Home/portfolio "Book"/"Contact" CTAs link to `/contact`. |
| D8 | Muse stories | Codex home has a 3-card "Muse stories" teaser + story `<dialog>`s with hardcoded copy. Replace that hardcoded copy by reading the **existing muses collection**; link cards to `/stories/{id}` instead of opening dialogs. CMS/collection is the source of truth. |
| D9 | Consistency gap | Shared `Header.astro`/`Footer.astro` + unified `:root` tokens bridge Codex (home/portfolio) and legacy (experience/stories/contact). Accept differing section layouts; keep brand, nav, type scale, color identical. |

---

### File Plan

```
src/
  styles/
    global.css            # EXTEND :root tokens (D3); keep picture{display:contents}
    codex-base.css        # NEW: ported css/styles.css (home + shared Codex primitives)
    codex-portfolio.css   # NEW: ported css/portfolio.css
  components/
    Header.astro          # REWRITE markup to Codex masthead + mobile menu toggle
    Footer.astro          # REWRITE markup to Codex footer (keep real nav routes)
    Pic.astro             # UNCHANGED
    SiteMotion.astro      # NEW: <script> loader for motion.ts (home) 
  scripts/
    motion.ts             # NEW: port js/main.js motion (reveal/parallax/hero) + nav
    portfolio.ts          # NEW: port js/portfolio.js (reveal, lightbox, exp video)
  pages/
    index.astro           # REWRITE to Codex homepage sections
    portfolio.astro       # REWRITE to Codex portfolio sections
    experience.astro      # UNCHANGED
    stories.astro         # UNCHANGED
    contact.astro         # UNCHANGED (real AC backend)
  assets/images/          # ADD Codex .webp (replace PNG placeholders)
    hero.webp, look-again≈portrait.webp, exp-band≈story/closing,
    story-1..3 ≈ story-softness/perspective/portrait.webp, your-turn≈closing.webp,
    portfolio/portrait-01..09.webp, portfolio/banner.webp
public/
  admin/config.yml        # UNCHANGED (CMS survives)
aws/, .github/            # UNCHANGED (stack + CI/CD survive)
```

**Deleted from Codex (not ported):** `assets/vendor/gsap*` (→ npm), `assets/fonts/cormorant*` (D4), consultation-dialog markup + mailto handler in `main.js` (D7), hardcoded `STORIES` object (D8).

---

### Design Tokens — one system (D3)

Port Codex values into Astro's existing `:root`, aliasing names so both the ported Codex CSS and legacy CSS resolve against one source.

```css
/* src/styles/global.css :root — extend, do not fork */
:root{
  /* existing Astro (kept) */
  --ivory:#F4F0E8; --white:#FCFBF8; --ink:#171717;
  --gold:#B89C74; --stone:#D7CEC4; --taupe:#A99888;
  --display:"ivypresto-display",Georgia,"Times New Roman",serif;
  --sans:"Manrope Variable",Manrope,Arial,sans-serif;

  /* Codex aliases so ported css/*.css resolves without renames */
  --paper:#fcfbf8;            /* Codex --paper == Astro --white */
  --black:var(--ink);         /* Codex --black  */
  --champagne:var(--gold);    /* Codex --champagne */
  --umber:#302b24;            /* Codex-only dark panel */
  --serif:var(--display);     /* same family, one kit (mdr5myc) */
  --body-size:15px; --body-leading:1.7;
  --content-width:1120px;     /* Codex --content-width */
  --ease:cubic-bezier(0.22,1,0.36,1);
}
```

**Typekit note:** both sites load the same `ivypresto-display` family via *different* kit ids — Astro `mdr5myc` (`Base.astro` via `PUBLIC_ADOBE_FONTS_PROJECT`), Codex `dis2zlj`. Keep **`mdr5myc`** only; the ported Codex CSS references `--serif`, so no `dis2zlj` link is added.

---

## Components and Interfaces

### Core Interfaces / Types

```ts
// src/scripts/motion.ts
export interface MotionConfig {
  heroDuration: number;      // 1.2
  heroStagger: number;       // 0.13
  revealDuration: number;    // 0.85
  revealDistance: number;    // 26 (px, desktop)
  scrollStart: string;       // 'top 88%'
  desktopParallax: number;   // 35
}
// CONFIG.contactEmail is DROPPED (D7). No mailto in Astro.

export function initMotion(cfg?: Partial<MotionConfig>): void;
export function initNav(): void;        // mobile menu toggle + escape close
```

```ts
// src/scripts/portfolio.ts
export interface PortfolioMotion {
  rowDuration: number;   // 1.05
  rowStagger: number;    // 0.09
  revealDistance: number;// 22
  imageDrift: number;    // 14
  pointerDrift: number;  // 4
}
export function initPortfolioGrid(): void;   // row reveal + drift + pointer parallax
export function initLightbox(): void;        // <dialog> gallery, arrows, swipe, count
export function initExperienceVideo(): void; // youtube-nocookie embed lifecycle
```

### Key Functions with Formal Specifications

### `initMotion(cfg)` — ported from `js/main.js`

```ts
export function initMotion(cfg = CONFIG): void
```
**Preconditions**
- `window.gsap` and `window.ScrollTrigger` are loaded (bundled by npm `gsap`; if import fails, function returns early and content stays visible).

**Postconditions**
- When `(prefers-reduced-motion: reduce)` matches → **no** animations registered; elements remain at natural position/opacity (never hidden by JS).
- Otherwise: hero timeline (image scale-in + `[data-hero-line]` stagger + `[data-hero-item]`), each `[data-reveal]` fades up once at `scrollStart`, desktop-only `[data-parallax]` scrub.
- `ScrollTrigger.refresh()` is called after `document.fonts.ready` and on `load`.
- No network/email side effects (CONFIG.contactEmail removed, D7).

**Invariants**
- Content is readable with JS disabled or GSAP absent (progressive enhancement; mirrors Codex guarantee).

### `initLightbox()` — ported from `js/portfolio.js` + `main.js` gallery

```ts
export function initLightbox(): void
```
**Preconditions**
- `#gallery-dialog` native `<dialog>` exists; `[data-portfolio-index]` buttons exist and carry `data-title`/`data-caption`; each wraps one `<img>`.

**Postconditions**
- `GALLERY` is derived from DOM order of `[data-portfolio-index]` (markup is source of truth — matches Codex).
- Opening sets image/title/caption/count `NN / NN`; `←/→` keys and touch-swipe (>55px) wrap-navigate; Escape closes (native dialog); focus returns to the invoking trigger.
- `renderGallery(i)` normalizes index as `(i + len) % len` (never out of range).

**Invariants**
- Exactly one dialog open at a time; `body.dialog-open` reflects open state.

### `initExperienceVideo()` — ported from `js/portfolio.js`

```ts
export function initExperienceVideo(): void
```
**Preconditions**: `#experience-dialog` + `#experience-video` iframe exist.
**Postconditions**
- No request to YouTube until a `[data-open-experience]` trigger is clicked (privacy: `youtube-nocookie`, `src` built on demand).
- `autoplay=0` when reduced-motion matches, else `1`.
- On dialog `close`, `iframe.src = 'about:blank'` (stops playback).

### Contact reconciliation (D7) — **no new function**

The Codex consultation `<dialog>` + `#consultation-form` mailto flow is **not ported**. The existing `contact.astro` (real AC Lambda, JSON POST, `?sent=1/0` no-JS fallback, `is:inline` enhancer) is authoritative and unchanged. Home/portfolio CTAs that said `data-open-consultation` become `<a href="/contact">`.

---

### Section → Component Mapping

### Home (`index.astro`) ← Codex `index.html`
| Codex section | Becomes | Images via Pic | Notes |
|---|---|---|---|
| `.hero` | `<section class="hero">` + `<Header/>` slot | `hero.webp` `priority` | `data-hero-line`/`data-hero-item` kept for motion |
| `.perspective` (Look Again) | `<section class="perspective">` | `portrait.webp` | "Preview a portrait" button → **link to `/portfolio`** (drop gallery dialog on home) or keep lightbox (open Q1) |
| `.experience` steps | `<section class="experience">` | CSS texture (no image) | pure CSS gradient band, no download |
| `.stories` (3 cards) | `<section class="stories">` | muse `cardImage` through Pic | **data from muses collection (D8)**; cards link `/stories/{id}` |
| `.closing` (Your Turn) | `<section class="closing">` | `closing.webp` | CTA → `/contact` (D7) |

### Portfolio (`portfolio.astro`) ← Codex `portfolio.html`
| Codex section | Becomes | Images via Pic |
|---|---|---|
| `.portfolio-hero` | `<section>` + `<Header/>` | `hero.webp` `priority` |
| `.portfolio-collection` 9-up grid | `.map(PortfolioCard)` | `portfolio/portrait-01..09.webp` |
| `.portfolio-manifesto` band | `<section>` | `portfolio/banner.webp` |
| `.portfolio-experience` film | `<section>` + `#experience-dialog` | `story-portrait.webp` thumb |
| `.portfolio-process` | `<section>` | — |
| `.portfolio-closing` | `<section>` | `hero.webp` |

CSS ports verbatim into `codex-portfolio.css`; selectors already target `.portfolio-*` classes and resolve tokens via the aliases in D3.

---

### Images through the Pic pipeline (D6)

```astro
---
// portfolio.astro frontmatter
import p01 from '../assets/images/portfolio/portrait-01.webp';
// …p02..p09, banner
const cards: PortfolioCard[] = [
  { src: p01, title:'Quiet confidence', caption:'A quiet gaze. An entirely personal kind of presence.', alt:'…' },
  // index order == lightbox order (markup is source of truth)
];
---
<div class="portfolio-grid">
  {cards.map((c,i)=>(
    <button class="portfolio-card" data-portfolio-index={i} data-title={c.title} data-caption={c.caption}>
      <span class="portfolio-card__frame"><Pic src={c.src} alt={c.alt} widths={[341,512,682,1024]}
            sizes="(max-width:768px) 50vw, 33vw" /></span>
      <span class="portfolio-card__caption"><span>{c.title}</span><span aria-hidden="true">↗</span></span>
    </button>
  ))}
</div>
```

- `.webp` imports resolve to `ImageMetadata` → `<Picture>` emits AVIF/WebP + srcset with baked dimensions (no layout shift).
- `picture{display:contents}` keeps `.portfolio-card__frame img` rules applying to the inner `<img>` exactly as Codex authored them. Add `.portfolio-card__frame img{height:…}` guard where a rule drives shape by `aspect-ratio` (same pattern already used for `.story-grid img{height:auto}`).
- Growing story photos (future) use the planned media-bucket/CloudFront resizer — out of scope here; the lightbox reads whatever `src` the markup carries, so swapping to CDN URLs later needs no JS change.

---

### Motion system in Astro (D5)

```astro
---
// src/components/SiteMotion.astro — included by index.astro & portfolio.astro
---
<script>
  import { initMotion, initNav } from '../scripts/motion.ts';
  initNav();
  initMotion();
</script>
```
```astro
<!-- portfolio.astro also includes -->
<script>
  import { initPortfolioGrid, initLightbox, initExperienceVideo } from '../scripts/portfolio.ts';
  initPortfolioGrid(); initLightbox(); initExperienceVideo();
</script>
```
- `gsap` + `ScrollTrigger` imported from the npm package inside `motion.ts`/`portfolio.ts` → Astro bundles + defers them (replaces `assets/vendor/*` and the `<script defer>` tags).
- `prefers-reduced-motion` honored inside each init (ported `gsap.matchMedia` branches); CSS `@media (prefers-reduced-motion: reduce)` blocks port verbatim.

---

### Example Usage

```astro
---
// index.astro (abridged)
import Base from '../layouts/Base.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import Pic from '../components/Pic.astro';
import SiteMotion from '../components/SiteMotion.astro';
import { getCollection } from 'astro:content';
import hero from '../assets/images/hero.webp';
import lookAgain from '../assets/images/portrait.webp';
import closing from '../assets/images/closing.webp';
const teaser = (await getCollection('muses')).sort((a,b)=>a.data.order-b.data.order).slice(0,3);
---
<Base>
  <main id="main-content">
    <section class="hero" id="home">
      <Header/>
      <div class="hero__image" data-hero-image data-parallax><Pic src={hero} alt="…" priority/></div>
      <div class="container hero__content">
        <h1 class="hero__title">
          <span class="line-mask"><span data-hero-line>A portrait</span></span>…
        </h1>
        <a class="button" href="/contact" data-hero-item>Book your consultation</a>
      </div>
    </section>
    <!-- …perspective / experience… -->
    <section class="stories" id="stories">
      <div class="stories__grid">
        {teaser.map(m=>(
          <a class="story-card" href={`/stories/${m.id}`} data-reveal>
            <span class="image-frame story-card__image"><Pic src={m.data.cardImage} alt={m.data.name}/></span>
            <span class="story-card__title">{m.data.tagline}</span>
          </a>
        ))}
      </div>
    </section>
  </main>
  <Footer/>
  <SiteMotion/>
</Base>
```

---

## Data Models

### PortfolioCard — page-local grid data (D6)

```ts
// Portfolio grid card — page-local data in portfolio.astro frontmatter (D6).
// NOT a content collection: this is marketing art direction, not muse content.
interface PortfolioCard {
  src: ImageMetadata;   // imported src/assets/images/portfolio/portrait-0N.webp
  title: string;        // data-title → caption + lightbox title
  caption: string;      // data-caption → lightbox figcaption
  alt: string;
}
```

### Home "Muse stories" teaser — derived from the muses collection (D8)

```ts
// Home "Muse stories" teaser — derived from the EXISTING muses collection (D8).
import { getCollection } from 'astro:content';
const muses = (await getCollection('muses')).sort((a,b)=>a.data.order-b.data.order);
const teaser = muses.slice(0,3); // card → href={`/stories/${m.id}`}
```

---

## Correctness Properties

### Property 1: Muses collection intact

`getCollection('muses')` still returns 6 entries; `stories.astro` + `[slug].astro` render unchanged.

### Property 2: Contact uses the real AC backend

`contact.astro` POSTs to `PUBLIC_AC_FORM_ENDPOINT`; `?sent=1/0` banner works; no mailto anywhere.

### Property 3: Rasters go through astro:assets

Every home/portfolio raster renders as `<picture>` AVIF+WebP+srcset (astro:assets), none as bare `<img src=".webp">`.

### Property 4: Content readable without JS

With JS disabled, home + portfolio content is fully readable; no element hidden by script.

### Property 5: Reduced motion honored

`prefers-reduced-motion:reduce` ⇒ zero GSAP tweens; CSS transitions neutralized.

### Property 6: Lightbox index bounded

Lightbox index always in [0,len); ←/→ wrap; Escape closes; focus returns to trigger.

### Property 7: Experience video is privacy-safe

Experience video issues no YouTube request until a trigger is clicked; closing resets src.

### Property 8: Platform artifacts survive untouched

`public/admin/config.yml`, `aws/**`, `.github/workflows/deploy.yml` byte-identical (CMS + stack + CI/CD survive).

### Property 9: One token system, one font kit

One `:root` token system; no second Typekit kit (`dis2zlj` absent); Cormorant fallback absent.

### Property 10: Build succeeds without duplicate gsap

npm build (`astro build`) succeeds; `dist/` emitted; no vendored gsap in bundle graph twice.

---

## Error Handling

| Scenario | Handling |
|---|---|
| GSAP import fails / unsupported | `initMotion` returns early; static content visible (P4). |
| `.webp` missing at build | `astro:assets` import throws at build → caught in CI before deploy (fail fast). |
| Muse has no `cardImage` | schema default (`/images/ms-muse-1.svg`) renders through Pic string passthrough. |
| AC endpoint unset | contact native POST still valid once set; JS enhancer no-ops (existing behavior). |
| Lightbox opened with 0 cards | `initPortfolioGrid`/`initLightbox` guard `if(!cards.length) return;` (ported). |

---

## Testing Strategy

**Unit (vitest + jsdom)** — `src/scripts/*.ts`
- `renderGallery` index wrap math (P6); property test over random int indices.
- reduced-motion branch registers no tweens (mock `matchMedia`).
- experience video src only set after click; reset on close (P7).

**Build/integration**
- `astro build` in CI; assert `dist/` home+portfolio contain `<source type="image/avif">` and no `src="…​.webp"` bare `<img>` (P3).
- Grep guard in CI: fail if `use.typekit.net/dis2zlj`, `mailto:`, or `assets/vendor/gsap` appear in `dist/` or `src/` (P2, P9).
- Snapshot `getCollection('muses').length === 6` (P1).

**Manual**
- Keyboard: tab to a portfolio card → Enter opens lightbox → arrows → Escape → focus returns (P6).
- Lighthouse on home + portfolio (LCP = hero `priority`).
- Visual consistency pass: Header/Footer/type/color identical across Codex pages and legacy experience/stories/contact (D9).

**PBT library:** `@fast-check/vitest`.

---

## Dependencies

- Add: `gsap` (npm). Keep: `@fontsource-variable/manrope`, `astro`, `sharp` (image service).
- Remove from repo: Codex `assets/vendor/gsap.min.js`, `ScrollTrigger.min.js`, Cormorant woff2.
- External: Adobe Typekit `mdr5myc` (ivypresto-display) via `Base.astro`.

---

## Open Questions

1. **Home "Preview a portrait":** link to `/portfolio` (simpler) or reuse the portfolio lightbox on home (more JS on home)? Default: link to `/portfolio`.
2. **Image mapping:** confirm Codex→Astro slot pairing where the Codex set lacks a 1:1 (e.g. `exp-band`, `your-turn`): proposal uses `closing.webp`/`story-*`. Confirm or supply exact files.
3. **Portfolio captions as content:** keep page-local (D6) or expose later via a lightweight CMS collection? Default: page-local now.
