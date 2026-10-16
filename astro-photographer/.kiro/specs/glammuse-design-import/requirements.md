# Requirements Document

## Introduction

This feature imports the Codex static site's visual design (its home and portfolio look, markup, CSS, and motion) into the existing Astro platform, so that the Home and Portfolio pages adopt the Codex aesthetic while every existing Astro platform capability survives untouched: the muses content collection, the Sveltia CMS, the `Pic.astro`/`astro:assets` image pipeline, the real ActiveCampaign inquire Lambda and its API, the CloudFormation stack, and the GitHub Actions deploy. The `experience`, `stories`, and `inquire` pages keep their current Astro design, and a shared Header/Footer/token layer bridges the visual-consistency gap.

The work is derived from an already-approved design (design-first workflow). It also formalizes two new product decisions: (1) when there is no clean one-to-one mapping between a Codex element and an Astro element, the Codex structure wins by default; and (2) the fixed marketing/art-direction media (hero, portfolio portraits, banner, etc.) must use stable, predictable filenames so a future direct-to-S3 "replace-by-filename" upload admin can swap a file without a CMS round-trip. That future upload admin is out of scope here, but the current work must not block it.

Each requirement below is written to map cleanly to the design's ten correctness properties so that design properties can later cite "Validates: Requirements X.Y".

## Glossary

- **Codex_Site**: The pre-existing static site (`index.html`, `portfolio.html` plus their CSS and JS) whose visual design is being ported into the Astro platform.
- **Astro_Platform**: The existing Astro application in `astro-photographer/`, including its pages, components, content collections, build pipeline, and deployment artifacts.
- **Muses_Collection**: The existing Astro content collection named `muses`, authored through the CMS, that is the source of truth for muse/story content.
- **CMS**: The Sveltia content management system configured at `public/admin/config.yml` that authors Muses_Collection content.
- **Pic**: The existing `Pic.astro` component that wraps `astro:assets` to emit responsive `<picture>` elements (AVIF/WebP, srcset, baked dimensions).
- **Image_Pipeline**: The `Pic` + `astro:assets` processing path that transforms imported raster assets into optimized `<picture>` output.
- **AC_Lambda**: The real ActiveCampaign inquire backend (Lambda behind API Gateway) that the existing `inquire.astro` form posts to.
- **GSAP_Motion**: The animation system ported from the Codex JavaScript, implemented as bundled client modules (`motion.ts`, `portfolio.ts`) using the npm `gsap` package and `ScrollTrigger`.
- **Lightbox**: The native `<dialog>`-based portfolio image gallery (keyboard navigation, swipe, index wrapping) ported from the Codex JavaScript.
- **Experience_Video**: The YouTube (`youtube-nocookie`) film embed shown in a dialog on the portfolio page.
- **Design_Token_System**: The single `:root` CSS custom-property set that both the ported Codex CSS and the legacy Astro CSS resolve against.
- **Shared_Chrome**: The shared `Header.astro` and `Footer.astro` components plus unified tokens that provide brand, navigation, type scale, and color consistency across all pages.
- **Fixed_Media**: Marketing / art-direction raster and video assets used by Home and Portfolio (hero, portfolio portraits, manifesto banner, closing, etc.) that are NOT muse content and are NOT authored through the CMS.
- **Replace_By_Filename**: A future workflow where the photographer uploads a photo or video directly to S3 under a fixed, predictable filename that overwrites the previous file of the same name, with no CMS round-trip. The upload admin that performs this is out of scope for this spec.
- **Platform_Artifacts**: The non-visual Astro_Platform assets that must survive unchanged: `public/admin/config.yml` (CMS), everything under `aws/`, and `.github/workflows/deploy.yml` (CI/CD).

## Requirements

### Requirement 1: Home page adopts the Codex look

**User Story:** As a site visitor, I want the Home page to present the Codex visual design, so that the brand's refined look is the first thing I see.

#### Acceptance Criteria

1. WHEN the Home page is rendered, THE Astro_Platform SHALL present the Codex hero section, perspective ("Look Again") section, experience-steps section, stories-teaser section, and closing section in Codex markup and layout.
2. THE Astro_Platform SHALL render the Home hero image with the Codex hero motion hooks (`data-hero-line`, `data-hero-item`, `data-hero-image`) preserved.
3. WHERE a Home closing call-to-action invites booking, THE Astro_Platform SHALL link that call-to-action to `/inquire`.
4. THE Astro_Platform SHALL keep the `experience`, `stories`, and `inquire` pages on their existing Astro design.

### Requirement 2: Portfolio page adopts the Codex look

**User Story:** As a site visitor, I want the Portfolio page to present the Codex visual design, so that the gallery experience matches the Codex art direction.

#### Acceptance Criteria

1. WHEN the Portfolio page is rendered, THE Astro_Platform SHALL present the Codex portfolio-hero section, nine-item collection grid, manifesto banner section, experience-film section, process section, and closing section in Codex markup and layout.
2. THE Astro_Platform SHALL render the portfolio collection grid as nine cards whose DOM order matches the Lightbox navigation order.
3. THE Astro_Platform SHALL source the portfolio grid card content from page-local data in the portfolio page frontmatter rather than from the Muses_Collection.

### Requirement 3: Default to the Codex structure when no clean mapping exists

**User Story:** As the site owner, I want the Codex design to win whenever a mapping is ambiguous, so that we do not drift into invented Astro-specific alternatives.

#### Acceptance Criteria

1. WHERE a Codex section, component, or image slot has no clean one-to-one Astro equivalent, THE Astro_Platform SHALL adopt the Codex structure, component, and layout rather than an Astro-specific alternative.
2. WHERE a Codex image slot lacks a one-to-one Astro asset, THE Astro_Platform SHALL use the Codex layout and the Codex-defined filename for that slot.
3. WHERE the Codex Home "Preview a portrait" control has no clean Astro equivalent, THE Astro_Platform SHALL retain the Codex behavior for that control.

### Requirement 4: GSAP motion system

**User Story:** As a site visitor, I want the Codex animations (hero reveal, scroll reveals, parallax), so that the page feels alive the way the Codex design intends.

#### Acceptance Criteria

1. WHEN the Home page loads, THE GSAP_Motion SHALL play the Codex hero timeline (image scale-in, `data-hero-line` stagger, `data-hero-item` reveal).
2. WHEN a `data-reveal` element scrolls into view at the configured scroll start, THE GSAP_Motion SHALL fade it up once.
3. WHILE the viewport is desktop width, THE GSAP_Motion SHALL apply the Codex parallax scrub to `data-parallax` elements.
4. THE Astro_Platform SHALL load GSAP_Motion from the npm `gsap` package bundled and deferred by Astro, with no vendored `assets/vendor/gsap` files in the build graph.

### Requirement 5: Reduced-motion support and progressive enhancement

**User Story:** As a visitor who disables JavaScript or prefers reduced motion, I want the content to remain fully readable, so that the design never locks me out.

#### Acceptance Criteria

1. IF the user agent reports `prefers-reduced-motion: reduce`, THEN THE GSAP_Motion SHALL register zero animation tweens and leave elements at their natural position and opacity.
2. IF the user agent reports `prefers-reduced-motion: reduce`, THEN THE Astro_Platform SHALL neutralize the corresponding CSS transitions.
3. WHILE JavaScript is disabled or GSAP fails to load, THE Astro_Platform SHALL keep all Home and Portfolio content fully readable with no element hidden by script.
4. IF the GSAP import fails, THEN THE GSAP_Motion SHALL return early and leave static content visible.

### Requirement 6: Portfolio lightbox

**User Story:** As a site visitor, I want to open portfolio images in a focused gallery and navigate them by keyboard or touch, so that I can view the work closely and accessibly.

#### Acceptance Criteria

1. THE Lightbox SHALL derive its gallery contents and order from the DOM order of the `data-portfolio-index` elements in the markup.
2. WHEN a portfolio card is activated, THE Lightbox SHALL open a single native `<dialog>` showing the selected image, title, caption, and a `NN / NN` count.
3. WHEN the user presses the left or right arrow key or swipes beyond the configured threshold, THE Lightbox SHALL navigate to the adjacent image and wrap at the ends.
4. THE Lightbox SHALL compute the displayed index as `(i + len) % len` so that the index always remains within `[0, len)`.
5. WHEN the user presses Escape, THE Lightbox SHALL close the dialog and return focus to the invoking trigger.
6. IF the portfolio grid contains zero cards, THEN THE Lightbox SHALL take no action.

### Requirement 7: Experience video privacy lifecycle

**User Story:** As a privacy-conscious visitor, I want no third-party video requests until I choose to watch, so that my visit is not shared with YouTube by default.

#### Acceptance Criteria

1. THE Experience_Video SHALL issue no request to YouTube until a `data-open-experience` trigger is activated.
2. WHEN an experience trigger is activated, THE Experience_Video SHALL build the `youtube-nocookie` embed source on demand.
3. IF `prefers-reduced-motion: reduce` matches, THEN THE Experience_Video SHALL set `autoplay=0`, ELSE THE Experience_Video SHALL set `autoplay=1`.
4. WHEN the experience dialog closes, THE Experience_Video SHALL reset the iframe source to `about:blank`.

### Requirement 8: Inquire reconciliation — the real ActiveCampaign backend wins

**User Story:** As the site owner, I want inquire submissions to continue flowing to ActiveCampaign, so that no leads are lost to a ported mailto flow.

#### Acceptance Criteria

1. THE Astro_Platform SHALL keep the existing `inquire.astro` form posting to the AC_Lambda endpoint unchanged.
2. THE Astro_Platform SHALL preserve the existing `?sent=1` / `?sent=0` no-JavaScript inquire fallback behavior.
3. WHERE a Home or Portfolio call-to-action targets booking or inquire, THE Astro_Platform SHALL link it to `/inquire`.
4. THE Astro_Platform SHALL contain no `mailto:` inquire flow and SHALL NOT port the Codex consultation dialog.

### Requirement 9: Home stories teaser derived from the muses collection

**User Story:** As a content editor, I want the Home stories teaser to reflect CMS content, so that updating muses in the CMS updates the Home teaser without code changes.

#### Acceptance Criteria

1. WHEN the Home page is rendered, THE Astro_Platform SHALL populate the stories-teaser cards from the Muses_Collection ordered by the muse `order` field.
2. THE Astro_Platform SHALL display at most three muse cards in the Home stories teaser.
3. WHEN a Home stories-teaser card is rendered, THE Astro_Platform SHALL link it to `/stories/{id}` for its muse.
4. THE Astro_Platform SHALL render Home stories-teaser card imagery through Pic.

### Requirement 10: Images routed through the Pic / astro:assets pipeline

**User Story:** As a site visitor, I want fast, correctly sized images, so that pages load quickly with no layout shift.

#### Acceptance Criteria

1. WHEN a Home or Portfolio raster image is rendered, THE Astro_Platform SHALL emit it through Pic as a `<picture>` element with AVIF and WebP sources and a srcset.
2. THE Astro_Platform SHALL NOT render any Home or Portfolio raster as a bare `<img src="….webp">` element.
3. THE Astro_Platform SHALL preserve the `picture { display: contents }` rule so that Codex image-frame CSS continues to target the inner `<img>`.
4. THE Astro_Platform SHALL render the Home and Portfolio hero images with the `priority` loading hint.

### Requirement 11: Stable, predictable filenames for fixed media (future replace-by-filename)

**User Story:** As the site owner, I want to later replace a hero or portfolio photo by uploading over a fixed filename in S3, so that I can swap marketing media without a CMS round-trip or a code change.

#### Acceptance Criteria

1. THE Astro_Platform SHALL reference each Fixed_Media asset by a fixed, predictable filename that supports a Replace_By_Filename swap.
2. THE Astro_Platform SHALL keep Fixed_Media independent of the CMS and the Muses_Collection.
3. WHERE the Image_Pipeline produces content-hashed output URLs that would break a Replace_By_Filename swap, THE Astro_Platform SHALL keep the source filename stable and document the strategy that reconciles stable source filenames with the hashed-output behavior.
4. THE Astro_Platform SHALL NOT introduce any dependency that requires a CMS edit in order to swap a Fixed_Media asset.

### Requirement 12: One design-token system and one font kit

**User Story:** As a maintainer, I want a single token and font setup, so that Codex and legacy pages resolve against one source without duplication.

#### Acceptance Criteria

1. THE Design_Token_System SHALL be a single `:root` token set that both the ported Codex CSS and the legacy Astro CSS resolve against, with Codex aliases mapping to the existing Astro tokens.
2. THE Astro_Platform SHALL load the `ivypresto-display` family through the Typekit kit `mdr5myc` only and SHALL NOT include the Codex Typekit kit `dis2zlj`.
3. THE Astro_Platform SHALL provide the sans family through `@fontsource-variable/manrope` and SHALL NOT include the Codex local Cormorant font fallback.

### Requirement 13: Visual-consistency bridge via shared chrome

**User Story:** As a site visitor, I want consistent branding across all pages, so that moving between Codex pages and legacy pages feels like one site.

#### Acceptance Criteria

1. THE Shared_Chrome SHALL render the same Header and Footer across the Codex Home and Portfolio pages and the legacy `experience`, `stories`, and `inquire` pages.
2. THE Shared_Chrome SHALL keep brand, navigation routes, type scale, and color identical across Codex and legacy pages.
3. THE Footer SHALL link to the real Astro_Platform navigation routes.

### Requirement 14: Platform artifacts and build survive untouched

**User Story:** As the site owner, I want the CMS, infrastructure, and deployment to keep working, so that adopting the Codex look introduces no platform regression.

#### Acceptance Criteria

1. THE Astro_Platform SHALL leave `public/admin/config.yml`, every file under `aws/`, and `.github/workflows/deploy.yml` byte-identical.
2. THE Astro_Platform SHALL keep the Muses_Collection returning its existing six entries.
3. THE Astro_Platform SHALL keep `stories.astro` and the muse detail route rendering unchanged.
4. WHEN `astro build` runs, THE Astro_Platform SHALL complete successfully and emit `dist/` with no gsap vendored twice in the bundle graph.
