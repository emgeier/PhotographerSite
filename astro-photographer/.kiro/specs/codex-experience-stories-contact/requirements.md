# Requirements Document

## Introduction

This feature completes the unification of The Glam Muse Series site to the Codex
design system and interaction model. It is derived from the approved design
document for `codex-experience-stories-contact` and formalizes that design into
testable requirements.

The work is delivered in two coordinated parts:

- **Part A — Experience & Stories redesign.** The two remaining bespoke pages
  (`experience.astro`, `stories.astro`), currently styled by `global.css`
  `.ex-*` / `.ms-*` blocks, are re-expressed in the Codex design system. There
  is no Codex original for either page, so these are new layouts composed from
  the Codex primitives, tokens, and motion already used by Home and Portfolio.
  Existing page content is carried forward, all imagery routes through
  `Pic.astro`, and the Stories `muses` content collection usage plus the working
  featured-muse rotator are preserved.
- **Part B — Sitewide contact dialog.** Contact becomes a sitewide popup built
  on the native `<dialog>` element and the Codex `.dialog` /
  `.consultation-dialog` styles. The popup matches the ivory-modal mockup at
  `Website/02 Glam Muse Series/05 Contact/contact_popup.png` but submits to the
  real ActiveCampaign Lambda (there is no mailto). The standalone `/contact`
  page is kept as the no-JS fallback and `?sent=` redirect target.

The design's nine correctness properties map to the numbered acceptance criteria
below so each can later be cited as "Validates: Requirements X.Y".

## Glossary

- **Codex design system**: The shared visual + interaction system expressed by
  `src/styles/codex-base.css` (and `codex-portfolio.css`), its design tokens,
  and the motion layer, already used by `index.astro` and `portfolio.astro`.
- **Codex primitive**: A reusable Codex building block — the `.hero` masthead
  treatment (absolute `Header`, `hero__image` + veil, `hero__content`),
  `.display-title` rendered at `font-weight: 100`, `.eyebrow`, `.short-rule`,
  `.button`, `.image-frame`, and the standard section rhythm.
- **Codex tokens**: The CSS custom properties in `global.css :root`, including
  `--content-width` (1120px with a 112px gutter) and `--header-h` (140px).
- **Pic**: `src/components/Pic.astro`, the image component wrapping
  `astro:assets`. Imported `src/assets` rasters emit a responsive `<Picture>`;
  string `/images/*` sources emit a passthrough `<img>`.
- **muses collection**: The Astro content-layer collection defined in
  `src/content.config.ts`, whose `entry.id` is the route slug, read via
  `getCollection('muses')`.
- **featured rotator**: The client-side script on the Stories page that cycles
  the featured-muse block through all muses, driven entirely by DOM ids /
  attributes (`#ms-featured-data`, `[data-featured-rotator]`,
  `#ms-featured-photo`, `#ms-featured-label`, `#ms-featured-name`,
  `#ms-featured-tag`, `#ms-featured-para`, `#ms-featured-link`,
  `#ms-featured-current`, `[data-featured-prev]`, `[data-featured-next]`).
- **AC Lambda / PUBLIC_AC_FORM_ENDPOINT**: The ActiveCampaign backend reached at
  the `PUBLIC_AC_FORM_ENDPOINT` environment URL. It is the single validation
  authority for lead capture and accepts the field names `first`, `last`,
  `email`, `phone`, `reason`, `more`, `feel`, `hear`.
- **Contact dialog**: The sitewide `ContactDialog.astro` native `<dialog>`
  (`#contact-dialog`) plus its controller `contact-dialog.ts`.
- **data-open-contact trigger**: Any element carrying the `data-open-contact`
  attribute; activating it opens the Contact dialog when JS is available.
- **/contact fallback**: The standalone `contact.astro` page kept as the no-JS
  fallback, the `?sent=1` / `?sent=0` redirect target, and a direct-link address.
- **single-dialog invariant**: The shared rule that at most one `<dialog>` is
  open at a time; before opening one, any other open dialog is closed. Already
  established by `src/scripts/portfolio.ts`.
- **reveal motion**: The GSAP-based scroll/entry animation driven by
  `SiteMotion.astro` → `initNav()` + `initMotion()`, keyed by `data-reveal`,
  `data-hero-image`, `data-hero-line`, and `data-hero-item` attributes.
- **SiteMotion**: `src/components/SiteMotion.astro`, which initializes the nav
  and reveal motion layer on each page.

## Requirements

### Requirement 1: Experience page re-expressed in the Codex design system

**User Story:** As a visitor, I want The Experience page to use the same refined
Codex look and motion as Home and Portfolio, so that the site feels like one
cohesive brand.

#### Acceptance Criteria

1. THE Experience_Page SHALL render the sections hero, process, inside-the-experience grid, and closing CTA using Codex primitives (the `.hero` masthead treatment with an absolute `Header`, `.display-title` at `font-weight: 100`, `.eyebrow`, `.short-rule`, `.button`, and `.image-frame`).
2. THE Experience_Page SHALL carry forward the existing content: the hero title "AN EXPERIENCE THAT FEELS LIKE YOU." with its lede, the three-step process (Consultation, Session, Reveal) with its copy, the inside-the-experience image grid, and the closing CTA "LET THIS BE YOUR MOMENT."
3. THE Experience_Page SHALL render process step numerals in the small label style (13px, uppercase, `var(--champagne)`).
4. THE Experience_Page SHALL layout using the Codex tokens `--content-width` (112px gutter) and `--header-h`.
5. THE Experience_Page SHALL include `SiteMotion` and annotate its sections with reveal-motion attributes (`data-hero-image`, `data-hero-line`, `data-hero-item`, `data-reveal`).

### Requirement 2: Stories page re-expressed in the Codex design system

**User Story:** As a visitor, I want the Muse Stories page to use the Codex look
and motion, so that it matches the rest of the site.

#### Acceptance Criteria

1. THE Stories_Page SHALL render the sections hero, featured muse, meet-the-muses grid, look-again band, in-motion teaser, and closing CTA using Codex primitives (the `.hero` masthead treatment with an absolute `Header`, `.display-title` at `font-weight: 100`, `.eyebrow`, `.short-rule`, `.button`, and `.image-frame`).
2. THE Stories_Page SHALL carry forward the existing content: the hero "MUSE STORIES" with sub and lede, the featured-muse block, the meet-the-muses grid, the "LOOK AGAIN." band, the "IN MOTION." teaser, and the closing CTA "YOU'VE SEEN THEIR STORIES."
3. THE Stories_Page SHALL layout using the Codex tokens `--content-width` (112px gutter) and `--header-h`.
4. THE Stories_Page SHALL include `SiteMotion` and annotate its sections with reveal-motion attributes (`data-hero-image`, `data-hero-line`, `data-hero-item`, `data-reveal`).

### Requirement 3: Muses content collection usage preserved

**User Story:** As the site owner, I want the Stories page to keep reading muse
data from the content collection, so that CMS-managed content continues to drive
the page.

#### Acceptance Criteria

1. THE Stories_Page SHALL read muses via `getCollection('muses')` and sort them by `entry.data.order` ascending.
2. THE Stories_Page SHALL render the meet-the-muses grid in `order` sequence, with each card linking to `/stories/{entry.id}`.
3. THE Stories_Page SHALL select the featured muse as the entry whose `data.featured` is true, falling back to the first ordered entry when none is marked featured.
4. WHERE the `muses` collection returns zero entries, THE Stories_Page SHALL render without throwing a build error.
5. THE muses collection ordering produced by `getCollection('muses')` sorted by `order` SHALL be deterministic, and the grid order SHALL equal the featured-rotator order.

### Requirement 4: Featured-muse rotator preserved

**User Story:** As a visitor, I want the featured-muse rotator to keep working
after the redesign, so that I can browse all muses from the featured block.

#### Acceptance Criteria

1. THE Stories_Page rebuilt featured markup SHALL preserve every DOM id and attribute the rotator script reads: `#ms-featured-data`, `[data-featured-rotator]`, `#ms-featured-photo`, `#ms-featured-label`, `#ms-featured-name`, `#ms-featured-tag`, `#ms-featured-para`, `#ms-featured-link`, `#ms-featured-current`, `[data-featured-prev]`, and `[data-featured-next]`.
2. WHILE the embedded `featuredList` contains more than one slide, WHEN a visitor activates the next or previous control, THE featured_rotator SHALL advance the index as `(i ± 1 + n) % n` and update the photo, label, name, tagline, paragraph, link href, and counter.
3. THE featured_rotator photo element (`#ms-featured-photo`) SHALL be a passthrough `<img>` whose `src` the script can set at runtime.

### Requirement 5: Stories "IN MOTION" section remains a placeholder (user decision)

**User Story:** As the site owner, I decided the in-motion section should stay a
placeholder for now, so that no real video is wired in this iteration.

#### Acceptance Criteria

1. THE Stories_Page "IN MOTION." section SHALL render as a poster/link placeholder without a wired video player.
2. THE Stories_Page SHALL NOT embed a real video source or video `<dialog>` in the "IN MOTION." section in this iteration.

### Requirement 6: All page images routed through Pic

**User Story:** As a visitor, I want responsive, appropriately sized images, so
that pages load efficiently on any device.

#### Acceptance Criteria

1. THE Experience_Page SHALL render every image through `Pic`.
2. THE Stories_Page SHALL render every image through `Pic`.
3. WHERE an image source is an imported `src/assets` raster, THE Pic SHALL emit a responsive `<Picture>` with capped widths that does not upscale beyond the source.
4. WHERE an image source is a string `/images/*` path, THE Pic SHALL emit a passthrough `<img>`.

### Requirement 7: Reduced-motion safety

**User Story:** As a visitor who prefers reduced motion, I want pages to be fully
readable without animation, so that the site respects my accessibility setting.

#### Acceptance Criteria

1. WHILE `prefers-reduced-motion: reduce` is active, THE SiteMotion SHALL register zero motion tweens.
2. WHILE `prefers-reduced-motion: reduce` is active, THE SiteMotion reveal safety-net SHALL force every `[data-reveal]` element to its visible resting state on the Experience and Stories pages.

### Requirement 8: Contact dialog appearance matches the mockup (user decision)

**User Story:** As a visitor, I want a polished contact popup, so that starting a
conversation feels inviting and on-brand.

#### Acceptance Criteria

1. THE Contact_Dialog SHALL render as a native `<dialog>` with id `contact-dialog`, styled by the Codex `.dialog` / `.consultation-dialog` system as an ivory modal.
2. THE Contact_Dialog SHALL render a top-right circular close control labeled with an "×" that dismisses the dialog.
3. THE Contact_Dialog SHALL render the eyebrow "YOUR STORY STARTS HERE", a large serif heading "Begin your story.", and a short intro paragraph.
4. THE Contact_Dialog SHALL lay out its visible fields as a name field and an email field on one row, a "WHAT BRINGS YOU HERE?" dropdown, an "ANYTHING YOU WOULD LIKE US TO KNOW (OPTIONAL)" textarea, a full-width dark submit button, and a reassurance line with the studio email beneath.
5. THE Contact_Dialog submit button SHALL read as a real submission (for example "Begin your story" or "Start the conversation") and SHALL NOT read "Prepare your email".
6. THE Contact_Dialog SHALL expose `aria-labelledby` referencing its heading and provide a status region with `role="status"` and `aria-live="polite"`.

### Requirement 9: Contact dialog submits to the real AC Lambda with explicit field mapping (user decision)

**User Story:** As the site owner, I want contact submissions to reach
ActiveCampaign exactly as they do today, so that lead capture is preserved
despite the simplified popup.

#### Acceptance Criteria

1. THE Contact_Dialog form `action` SHALL equal `PUBLIC_AC_FORM_ENDPOINT` with `method="POST"`, and the dialog SHALL NOT use a mailto draft.
2. THE Contact_Dialog SHALL POST a payload that satisfies the AC Lambda field contract (`first`, `last`, `email`, `phone`, `reason`, `more`, `feel`, `hear`) and that payload shape SHALL be identical to the one produced by the `/contact` page.
3. THE Contact_Dialog SHALL map its visible fields to Lambda field names as follows: the name field populates `first` (with `last` sent as an empty string when a single name field is used), the email field populates `email`, the "WHAT BRINGS YOU HERE?" dropdown populates `reason`, and the optional notes textarea populates `more`.
4. THE Contact_Dialog SHALL send the remaining Lambda field names not shown in the popup (`phone`, `feel`, `hear`) as empty strings so the payload contract remains complete.
5. WHEN a visitor submits the Contact_Dialog form with JS available, THE contact_dialog_controller SHALL run native `reportValidity()` first and, if valid, `preventDefault`, disable the submit button, show a sending status, and `fetch`-POST the serialized fields as JSON to the endpoint.
6. WHEN the AC Lambda responds with `{ ok: true }`, THE contact_dialog_controller SHALL show a success status and reset the form.
7. IF the `fetch` rejects or the response is not `{ ok: true }`, THEN THE contact_dialog_controller SHALL show an error status, re-enable the submit button, and preserve the entered values without resetting the form.

### Requirement 10: Sitewide contact triggers

**User Story:** As a visitor, I want to reach the contact popup from anywhere on
the site, so that I can start a conversation without leaving the page.

#### Acceptance Criteria

1. THE Site SHALL attach `data-open-contact` to the Home hero and closing CTAs, the Portfolio closing CTA, the Experience closing CTA, the Stories featured and closing CTAs, the story-detail CTA, the `Header` nav Contact link, and the `Footer` Contact link.
2. WHEN a visitor activates a `data-open-contact` trigger with JS available, THE contact_dialog_controller SHALL prevent default navigation and open `#contact-dialog`.
3. THE Site SHALL include `ContactDialog.astro` on every page that has a `data-open-contact` trigger.
4. IF a page includes a `data-open-contact` trigger but not the Contact dialog, THEN THE contact_dialog_controller SHALL no-op and the trigger SHALL fall back to navigation.

### Requirement 11: Progressive enhancement and /contact fallback (user decision)

**User Story:** As a visitor without JavaScript, I want contact to still work, so
that I can always submit an inquiry.

#### Acceptance Criteria

1. THE Site SHALL keep the standalone `/contact` page as the no-JS fallback, the `?sent=1` / `?sent=0` redirect target, and a direct-link address.
2. THE Site SHALL give every `data-open-contact` trigger a real `href="/contact"`.
3. IF `contact-dialog.ts` fails to load or JavaScript is disabled, THEN activating a `data-open-contact` trigger SHALL navigate to `/contact`.
4. WHEN the `/contact` native form submission returns via `?sent=1` or `?sent=0`, THE Contact_Page SHALL display the corresponding success or error banner.

### Requirement 12: Single-dialog invariant and body state

**User Story:** As a visitor, I want dialogs to behave predictably, so that only
one modal is ever open and the page is not left in a broken state.

#### Acceptance Criteria

1. THE Site SHALL maintain at most one open `<dialog>` at a time across the contact, gallery, and experience dialogs.
2. WHEN a dialog is opened, THE opening controller SHALL close any currently open `dialog[open]` before calling `showModal()`.
3. WHILE at least one dialog is open, THE Site SHALL apply the `dialog-open` class to `body`.
4. WHEN a dialog closes, THE closing controller SHALL remove the `body.dialog-open` class only if no other dialog remains open.

### Requirement 13: Focus return on dialog close

**User Story:** As a keyboard user, I want focus to come back to where I was, so
that I am not stranded after closing the popup.

#### Acceptance Criteria

1. WHEN a dialog closes, IF the invoking trigger is still connected to the document, THEN THE closing controller SHALL return focus to that trigger.

### Requirement 14: Platform preservation

**User Story:** As the site owner, I want the existing platform to stay intact,
so that the CMS, backend, tokens, and header keep working through the migration.

#### Acceptance Criteria

1. THE Site SHALL leave the Sveltia CMS schema (`public/admin/config.yml`) and the image pipeline unchanged.
2. THE Site SHALL leave the AC Lambda contract and `PUBLIC_AC_FORM_ENDPOINT` usage unchanged.
3. THE Site SHALL keep the shared `Header` masthead and the Codex `:root` tokens unchanged.
4. THE Home_Page SHALL continue to use the first three muses by `order` for its teaser, unaffected by the Stories redesign.
5. WHEN the project is built with `astro build`, THE build SHALL succeed with the rebuilt Experience and Stories pages carrying no `global.css` `.ex-*` / `.ms-*` dependency.
