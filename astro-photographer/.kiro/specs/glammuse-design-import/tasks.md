# Implementation Plan: glammuse-design-import

## Overview

Port the Codex static site's visual design into the Astro platform so the Codex look wins for **home + portfolio only**, while every platform capability (muses collection, Sveltia CMS, `Pic.astro`/`astro:assets`, the real ActiveCampaign Lambda, the CloudFormation stack, and the GitHub Actions deploy) survives untouched. The plan is ordered by dependency: foundation (tokens/fonts, gsap dependency, fixed-media assets + stable-filename strategy) → shared chrome + client motion/portfolio scripts → page rewrites (`index.astro`, `portfolio.astro`) through `Pic` → lightbox + experience video wiring → tests and build/grep verification.

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Each task builds on previous tasks and ends with wiring things together, leaving no orphaned code. Tasks focus only on writing, modifying, or testing code.

## Tasks

- [x] 1. Establish the one-system token/font foundation and the gsap dependency
  - [x] 1.1 Extend `src/styles/global.css` `:root` with the single Codex-aliased token set
    - In `src/styles/global.css`, extend the existing `:root` (do not fork) with Codex aliases: `--paper:#fcfbf8`, `--black:var(--ink)`, `--champagne:var(--gold)`, `--umber:#302b24`, `--serif:var(--display)`, `--body-size:15px`, `--body-leading:1.7`, `--content-width:1120px`, `--ease:cubic-bezier(0.22,1,0.36,1)` (design "Design Tokens — one system (D3)").
    - Preserve the existing `picture { display: contents }` rule so Codex image-frame CSS keeps targeting the inner `<img>`.
    - Keep the single Typekit kit `mdr5myc` for `ivypresto-display`; do NOT add the Codex kit `dis2zlj`. Keep `@fontsource-variable/manrope` for `--sans`; do NOT add the Codex local Cormorant fallback.
    - _Requirements: 12.1, 12.2, 12.3, 10.3_

  - [x] 1.2 Add the `gsap` npm dependency (vendor-free motion)
    - Install `gsap` via npm and record it in `package.json`; confirm `ScrollTrigger` is importable from the package.
    - Do NOT vendor `assets/vendor/gsap*` files anywhere in the build graph.
    - _Requirements: 4.4, 14.4_

  - [x] 1.3 Port the Codex base and portfolio CSS into scoped stylesheets
    - Create `src/styles/codex-base.css` from the Codex `css/styles.css` (home + shared Codex primitives) and `src/styles/codex-portfolio.css` from the Codex `css/portfolio.css`, verbatim so `.portfolio-*` selectors resolve against the D3 token aliases.
    - Port the Codex `@media (prefers-reduced-motion: reduce)` CSS blocks verbatim so reduced-motion transitions are neutralized in CSS.
    - _Requirements: 2.1, 3.1, 5.2, 12.1_

- [x] 2. Prepare Fixed_Media assets and the stable-filename strategy
  - [x] 2.1 Import Codex fixed-media rasters under stable, predictable filenames
    - Add the Codex `.webp` assets under `src/assets/images/` with fixed names: `hero.webp`, `portrait.webp` (Look Again), `closing.webp`, `story-1..3`/muse-teaser imagery, and `src/assets/images/portfolio/portrait-01..09.webp` plus `portfolio/banner.webp`.
    - Where the Codex set lacks a 1:1 Astro asset, adopt the Codex layout and the Codex-defined filename for that slot (default-to-Codex).
    - Keep Fixed_Media independent of the CMS and the Muses_Collection.
    - _Requirements: 3.2, 11.1, 11.2, 11.4_

  - [x] 2.2 Decide and document the stable-source-filename / hashed-output reconciliation strategy
    - Document (in a short comment block or `src/assets/images/README.md`) how stable source filenames reconcile with `astro:assets` content-hashed output URLs, so a future direct-to-S3 Replace_By_Filename swap stays possible without a CMS round-trip or code change.
    - Ensure the strategy introduces no dependency that forces a CMS edit to swap a Fixed_Media asset.
    - _Requirements: 11.1, 11.3, 11.4_

- [x] 3. Checkpoint - foundation ready
  - Ensure the project still type-checks and `astro build` runs with the new tokens, gsap dependency, and imported assets; ask the user if questions arise.

- [x] 4. Build the shared chrome (Header/Footer) bridging Codex and legacy pages
  - [x] 4.1 Rewrite `src/components/Header.astro` to the Codex masthead
    - Rewrite the markup to the Codex masthead with the mobile menu toggle, keeping the real Astro navigation routes and identical brand/type scale/color across Codex and legacy pages.
    - _Requirements: 13.1, 13.2, 3.1_

  - [x] 4.2 Rewrite `src/components/Footer.astro` to the Codex footer
    - Rewrite the markup to the Codex footer, linking to the real Astro_Platform navigation routes.
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 5. Port the client motion system (`src/scripts/motion.ts`)
  - [x] 5.1 Implement `motion.ts` with `MotionConfig`, `initMotion`, and `initNav`
    - Port `js/main.js` motion into `src/scripts/motion.ts`: hero timeline (image scale-in, `[data-hero-line]` stagger, `[data-hero-item]` reveal), `[data-reveal]` fade-up once at `scrollStart`, desktop-only `[data-parallax]` scrub; call `ScrollTrigger.refresh()` after `document.fonts.ready` and on `load`.
    - Import `gsap`/`ScrollTrigger` from the npm package; if the import fails, return early and leave static content visible.
    - Honor `prefers-reduced-motion: reduce` (register zero tweens; elements stay at natural position/opacity). Drop `CONFIG.contactEmail`/mailto (D7).
    - Implement `initNav()` (mobile menu toggle + Escape close).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 5.4_

  - [x]* 5.2 Write unit tests for `motion.ts` reduced-motion and import-failure branches
    - vitest + jsdom: mock `matchMedia` to assert the reduced-motion branch registers no tweens (**Property 5**, **Validates: Requirements 5.1**); assert a failed gsap import returns early with content visible (**Property 4**, **Validates: Requirements 5.4**).
    - _Requirements: 5.1, 5.4_

- [x] 6. Port the portfolio client script (`src/scripts/portfolio.ts`)
  - [x] 6.1 Implement `initPortfolioGrid` (row reveal + drift + pointer parallax)
    - Port `js/portfolio.js` grid motion into `src/scripts/portfolio.ts` with `PortfolioMotion` config; guard `if (!cards.length) return;`.
    - _Requirements: 4.2, 4.3, 5.1, 6.6_

  - [x] 6.2 Implement `initLightbox` native `<dialog>` gallery
    - Derive `GALLERY` from DOM order of `[data-portfolio-index]` elements (markup is source of truth); open `#gallery-dialog` showing image/title/caption and `NN / NN` count; `←/→` keys and touch-swipe (>55px) wrap-navigate; Escape closes and returns focus to the invoking trigger.
    - Implement `renderGallery(i)` to normalize index as `(i + len) % len`; guard zero cards.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x]* 6.3 Write property test for `renderGallery` index-wrap math
    - `@fast-check/vitest`: over random integer indices and lengths, assert the computed index is always in `[0, len)` (**Property 6**, **Validates: Requirements 6.4**).
    - _Requirements: 6.4_

  - [x] 6.4 Implement `initExperienceVideo` privacy lifecycle
    - No YouTube request until a `[data-open-experience]` trigger fires; build the `youtube-nocookie` embed src on demand; `autoplay=0` when reduced-motion matches else `autoplay=1`; on dialog `close` reset `iframe.src = 'about:blank'`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x]* 6.5 Write unit tests for experience video lifecycle
    - vitest + jsdom: assert no src is set before a trigger click and that src resets on close (**Property 7**, **Validates: Requirements 7.1, 7.4**).
    - _Requirements: 7.1, 7.4_

- [x] 7. Add the motion loader component
  - [x] 7.1 Create `src/components/SiteMotion.astro`
    - Add a bundled, deferred `<script>` that imports `initMotion`/`initNav` from `motion.ts` and calls them; this component is included by both `index.astro` and `portfolio.astro`.
    - _Requirements: 4.1, 4.4_

- [x] 8. Checkpoint - chrome and scripts ready
  - Ensure all unit/property tests pass and the scripts/components type-check; ask the user if questions arise.

- [x] 9. Rewrite the Home page (`src/pages/index.astro`) to the Codex look
  - [x] 9.1 Build Codex home sections with Pic imagery and CTAs to `/contact`
    - Rewrite `index.astro` with the Codex hero, perspective ("Look Again"), experience-steps, stories-teaser, and closing sections in Codex markup/layout; keep `data-hero-line`/`data-hero-item`/`data-hero-image` motion hooks; render the hero through `Pic` with the `priority` hint.
    - Route all home rasters through `Pic` (AVIF/WebP + srcset); no bare `<img src=".webp">`. Link the closing/booking CTA to `/contact`. Retain the Codex "Preview a portrait" behavior per default-to-Codex (link to `/portfolio`).
    - Include `<Header/>`, `<Footer/>`, and `<SiteMotion/>`.
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.3, 8.3, 10.1, 10.2, 10.4_

  - [x] 9.2 Wire the Home stories teaser to the muses collection
    - Populate the stories-teaser from `getCollection('muses')` sorted by `order`, sliced to at most three; render each card image through `Pic` and link each card to `/stories/{id}`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10. Rewrite the Portfolio page (`src/pages/portfolio.astro`) to the Codex look
  - [x] 10.1 Build Codex portfolio sections with the page-local 9-card grid through Pic
    - Rewrite `portfolio.astro` with the Codex portfolio-hero, nine-item collection grid, manifesto banner, experience-film, process, and closing sections in Codex markup/layout; render the hero with `Pic` + `priority`.
    - Define the `PortfolioCard[]` grid data in the page frontmatter (page-local, not CMS) importing `portfolio/portrait-01..09.webp`; render each card through `Pic` with `data-portfolio-index`/`data-title`/`data-caption` so DOM order equals lightbox order. Route all portfolio rasters through `Pic`; no bare `<img src=".webp">`.
    - Include `<Header/>`, `<Footer/>`, `<SiteMotion/>`, the `#gallery-dialog`, and the `#experience-dialog` + `#experience-video` iframe, and wire the `initPortfolioGrid`/`initLightbox`/`initExperienceVideo` script.
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 10.1, 10.2, 10.3, 10.4_

- [x] 11. Confirm the contact/platform guarantees in markup
  - [x] 11.1 Verify no mailto/consultation port and legacy pages unchanged
    - Confirm `contact.astro` still posts to the AC_Lambda endpoint with the `?sent=1`/`?sent=0` no-JS fallback intact; ensure no `mailto:` flow and no Codex consultation dialog were introduced; confirm `experience.astro`, `stories.astro`, and the muse detail route keep their existing Astro design/rendering.
    - _Requirements: 1.4, 8.1, 8.2, 8.4, 14.2, 14.3_

- [x] 12. Verification and CI guards
  - [x]* 12.1 Add image-pipeline build assertions
    - Assert built `dist/` home + portfolio HTML contains `<source type="image/avif">` and no bare `<img src="….webp">` (**Property 3**, **Validates: Requirements 10.1, 10.2**).
    - _Requirements: 10.1, 10.2_

  - [x]* 12.2 Add grep guards for forbidden artifacts
    - Fail the build if `use.typekit.net/dis2zlj`, `mailto:`, or `assets/vendor/gsap` appear in `src/` or `dist/` (**Property 2, 9, 10**, **Validates: Requirements 4.4, 8.4, 12.2, 12.3**).
    - _Requirements: 4.4, 8.4, 12.2, 12.3_

  - [x]* 12.3 Add muses-collection snapshot assertion
    - Assert `getCollection('muses').length === 6` (**Property 1**, **Validates: Requirements 14.2**).
    - _Requirements: 14.2_

  - [x] 12.4 Verify platform artifacts byte-identical and build succeeds
    - Confirm `public/admin/config.yml`, every file under `aws/`, and `.github/workflows/deploy.yml` are byte-identical to their pre-change state (e.g. `git diff --exit-code` on those paths), and run `astro build` to confirm it completes and emits `dist/` with gsap not vendored twice in the bundle graph (**Property 8, 10**).
    - _Requirements: 14.1, 14.4_

- [x] 13. Final checkpoint - ensure all tests pass
  - Ensure all tests pass and `astro build` succeeds, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit/property/integration tests, CI guards) and can be skipped for a faster MVP.
- Each task references specific requirements for traceability; property-test sub-tasks additionally cite the design property number.
- Default-to-Codex (Req 3) is honored in tasks 2.1, 4.1, 9.1, 10.1 where no clean 1:1 mapping exists.
- The stable-filename / Replace_By_Filename strategy (Req 11) is decided and documented in task 2.2 and applied in 2.1.
- Platform artifacts (`public/admin/config.yml`, `aws/**`, `.github/workflows/deploy.yml`) are left untouched and verified byte-identical in task 12.4.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "4.1", "4.2", "5.1", "6.1"] },
    { "id": 2, "tasks": ["5.2", "6.2", "6.4", "7.1"] },
    { "id": 3, "tasks": ["6.3", "6.5", "9.1", "10.1"] },
    { "id": 4, "tasks": ["9.2", "11.1"] },
    { "id": 5, "tasks": ["12.1", "12.2", "12.3", "12.4"] }
  ]
}
```
