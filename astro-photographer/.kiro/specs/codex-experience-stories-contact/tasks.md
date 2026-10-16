# Implementation Plan: Codex Experience, Stories & Sitewide Inquire Dialog

## Overview

This plan delivers the feature in two coordinated parts, built incrementally so
each step integrates with the last and nothing is left orphaned.

- **Part B first (foundation)**: the shared Inquire dialog component, its
  progressive-enhancement controller, and the sitewide triggers. The Experience
  and Stories CTAs (Part A) wire into this dialog, so the shared pieces land
  first.
- **Part A (page rebuilds)**: a new `codex-content.css`, then the rebuilt
  `experience.astro` and `stories.astro`, each composed from Codex primitives,
  routing images through `Pic`, preserving the muses collection usage and the
  featured rotator, and opening the shared dialog from their CTAs.
- **Final wiring + verification**: `astro build` and the test suite confirm the
  rebuilt pages carry no `global.css` `.ex-*`/`.ms-*` dependency and that the
  backend contract, dialogs, and motion all behave.

Tech stack is fixed by the design: Astro + TypeScript, Vitest + jsdom +
fast-check for property tests. The environment runs `npx astro build` and
vitest only (no dev/preview server), so all behavioral checks are automated.

## Tasks

- [x] 1. Build the shared Inquire dialog component (`ContactDialog.astro`)
  - [x] 1.1 Create `src/components/ContactDialog.astro` markup + AC form
    - Add a native `<dialog class="dialog consultation-dialog" id="inquire-dialog" aria-labelledby="inquire-dialog-title">` styled by the existing `.dialog` / `.consultation-dialog` rules in `codex-base.css`
    - Add the top-right circular close control via an outer `<form method="dialog">` with a `.dialog-close` submit button labeled with an "×" (`aria-hidden` span + `aria-label`)
    - Add the eyebrow "YOUR STORY STARTS HERE", a large serif heading `#inquire-dialog-title` "Begin your story.", and a short intro paragraph
    - Lay out visible fields: a name field + an email field on one row, a "WHAT BRINGS YOU HERE?" `<select>`, an "ANYTHING YOU WOULD LIKE US TO KNOW (OPTIONAL)" `<textarea>`, a full-width dark `.button` submit reading "Begin your story" (not "Prepare your email"), and a reassurance line with the studio email beneath
    - Add a status region `<p class="form-status" role="status" aria-live="polite">`
    - Set the inner form `action={import.meta.env.PUBLIC_AC_FORM_ENDPOINT}` with `method="POST"`; render inputs for every Lambda field name (`first`, `last`, `email`, `phone`, `reason`, `more`, `feel`, `hear`), mapping name→`first` (hidden/empty `last`), email→`email`, dropdown→`reason`, notes→`more`, and `phone`/`feel`/`hear` as empty-string inputs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4_

- [x] 2. Build the Inquire dialog controller (`inquire-dialog.ts`)
  - [x] 2.1 Implement `serializeForm(form)` and the `ContactPayload` type
    - Export `serializeForm(form: HTMLFormElement): ContactPayload` that maps the form's present fields (`FormData` → flat string object), serializing empty optional fields as `""`
    - Produce a payload shape identical to the one `/inquire` posts (`first`, `last`, `email`, `phone`, `reason`, `more`, `feel`, `hear`)
    - _Requirements: 9.2, 9.4_

  - [ ]* 2.2 Write unit test for `serializeForm`
    - Assert a populated `<form>` serializes present fields to the expected flat object and empty optional fields serialize as `""`
    - **Validates: Requirements 9.2, 9.4**

  - [x] 2.3 Implement `initContactDialog()` open/close + single-dialog + focus
    - Wire every `[data-open-inquire]` trigger: on click `preventDefault`, close any other open `dialog[open]`, `showModal()` on `#inquire-dialog`, set `body.dialog-open`, remember the trigger for focus return
    - On dialog `close`: clear `body.dialog-open` only if no other dialog remains open; return focus to the invoking trigger if it is still connected
    - Null-guard the dialog lookup so the controller no-ops when `#inquire-dialog` is absent (trigger falls back to its `href="/inquire"`)
    - Mirror the single-dialog invariant already in `src/scripts/portfolio.ts` so inquire/gallery/experience dialogs cooperate
    - _Requirements: 10.2, 10.4, 12.1, 12.2, 12.3, 12.4, 13.1_

  - [x] 2.4 Implement the AC fetch submit path
    - On inner-form `submit`: run native `reportValidity()` first; if valid `preventDefault`, disable the submit button, show a "Sending…" status, then `fetch`-POST `serializeForm(form)` as JSON (`Content-Type: application/json`) to the endpoint
    - On `{ ok: true }`: show a success status and `form.reset()`
    - On `fetch` rejection or a non-`{ ok: true }` response: show an error status, re-enable the submit button, and preserve entered values (no reset)
    - _Requirements: 9.5, 9.6, 9.7_

  - [ ]* 2.5 Write DOM/behavioral tests for the dialog controller
    - Clicking `[data-open-inquire]` opens `#inquire-dialog`, sets `body.dialog-open`; Escape/close returns focus to the trigger
    - Submit success path (`fetch` → `{ ok: true }`) shows success + resets; error path keeps values and shows error status
    - **Property 1, 3, 4, 5 — AC contract / single dialog / body state / focus return**
    - **Validates: Requirements 9.5, 9.6, 9.7, 12.1, 12.2, 12.3, 12.4, 13.1**

- [ ] 3. Wire the sitewide inquire triggers into existing pages/components
  - [x] 3.1 Add `data-open-inquire` to `Header.astro` and `Footer.astro` Inquire links
    - Keep each `href="/inquire"` and add `data-open-inquire`
    - _Requirements: 10.1, 11.2_

  - [x] 3.2 Add `data-open-inquire` to Home, Portfolio, and story-detail CTAs
    - `index.astro` hero + closing "Book your consultation", `portfolio.astro` closing CTA, and `stories/[slug].astro` CTA each keep `href="/inquire"` and gain `data-open-inquire`
    - Confirm Home still uses the first three muses by `order` for its teaser (unchanged)
    - _Requirements: 10.1, 11.2, 14.4_

  - [ ] 3.3 Include `ContactDialog.astro` and the controller on every page with a trigger
    - Render `ContactDialog.astro` near the end of `<body>` (after `Footer`, alongside `SiteMotion`) on Home, Portfolio, Experience, Stories, and story-detail
    - Initialize `initContactDialog()` where `SiteMotion`/scripts are set up so every triggered page wires the dialog
    - _Requirements: 10.3, 11.1, 11.3_

- [ ] 4. Checkpoint - inquire dialog foundation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create the Codex content stylesheet (`codex-content.css`)
  - [x] 5.1 Author `src/styles/codex-content.css` for Experience + Stories sections
    - Author new Experience/Stories section styles against Codex tokens (`--content-width`, `--header-h`, 112px gutter) and primitives; keep `global.css` untouched so `stories/[slug].astro` legacy `.st-*` surfaces keep working
    - Include the small process-numeral label style (13px, uppercase, `var(--champagne)`) reusing the `.experience-step__number` / `.portfolio-process__number` pattern
    - _Requirements: 1.3, 1.4, 2.3, 14.1, 14.3_

- [x] 6. Rebuild the Experience page (`experience.astro`)
  - [x] 6.1 Rebuild `experience.astro` with Codex primitives + reveal motion
    - Compose hero, process, inside-the-experience grid, and closing CTA from Codex primitives: `.hero` masthead with absolute `Header`, `hero__image` + veil, `hero__content`, `.display-title` at `font-weight: 100`, `.eyebrow`, `.short-rule`, `.button`, `.image-frame`
    - Carry forward existing content verbatim: hero "AN EXPERIENCE THAT FEELS LIKE YOU." + lede, the three-step process (Consultation, Session, Reveal) copy, the inside-the-experience image grid, and the closing CTA "LET THIS BE YOUR MOMENT."
    - Render process step numerals in the small label style; lay out with `--content-width` (112px gutter) and `--header-h`
    - Include `SiteMotion` and annotate sections with `data-hero-image`, `data-hero-line`, `data-hero-item`, `data-reveal`
    - Add `data-parallax` to the hero image and the inside-the-experience content photos so they get the same desktop scroll movement as Home/Portfolio (the Codex `.hero`/`.image-frame` primitives provide the scroll runway the legacy `.ex-*` hero lacked)
    - Give the closing CTA `href="/inquire"` + `data-open-inquire`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 11.2_

  - [x] 6.2 Route every Experience image through `Pic`
    - Replace raw `<img>` with `Pic` for the hero, process, and inside-the-experience images (imported `src/assets` rasters → responsive `<Picture>`, capped widths, no upscaling; string `/images/*` → passthrough `<img>`)
    - _Requirements: 6.1, 6.3, 6.4_

- [ ] 7. Rebuild the Stories page (`stories.astro`)
  - [x] 7.1 Preserve the muses frontmatter data pipeline
    - Read muses via `getCollection('muses')` and `.sort((a,b) => a.data.order - b.data.order)`
    - Select featured as `.find(e => e.data.featured) ?? entries[0]`; build `featuredList`, `featuredIndex`, and the `#ms-featured-data` JSON exactly as today
    - Guard the featured block render so a zero-entry collection does not throw at build
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Rebuild `stories.astro` sections with Codex primitives + reveal motion
    - Compose hero, featured muse, meet-the-muses grid, look-again band, in-motion teaser, and closing CTA from Codex primitives (`.hero` masthead with absolute `Header`, `.display-title` at `font-weight: 100`, `.eyebrow`, `.short-rule`, `.button`, `.image-frame`)
    - Carry forward content: hero "MUSE STORIES" + sub + lede, featured-muse block, meet-the-muses grid (cards link `/stories/{entry.id}` in `order`), "LOOK AGAIN." band, "IN MOTION." teaser, closing CTA "YOU'VE SEEN THEIR STORIES."
    - Lay out with `--content-width` (112px gutter) and `--header-h`; include `SiteMotion` with `data-hero-image`, `data-hero-line`, `data-hero-item`, `data-reveal`
    - Add `data-parallax` to the hero image and the featured/meet-the-muses content photos so they get the same desktop scroll movement as Home/Portfolio (`.hero`/`.image-frame` runway), excluding the `#ms-featured-photo` passthrough `<img>` the rotator mutates at runtime
    - Keep the "IN MOTION." section as a poster/link placeholder with no wired video player or video `<dialog>`
    - Give the featured and closing CTAs `href="/inquire"` + `data-open-inquire`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 5.1, 5.2, 10.1, 11.2_

  - [ ] 7.3 Preserve the featured-rotator DOM contract and route images through Pic
    - Keep every id/attribute the inline rotator script reads: `#ms-featured-data`, `[data-featured-rotator]`, `#ms-featured-photo`, `#ms-featured-label`, `#ms-featured-name`, `#ms-featured-tag`, `#ms-featured-para`, `#ms-featured-link`, `#ms-featured-current`, `[data-featured-prev]`, `[data-featured-next]`
    - Render `#ms-featured-photo` as a passthrough `<img>` (string `cardImage` src) whose `.src` the script can set at runtime; route all other Stories images through `Pic`
    - _Requirements: 4.1, 4.2, 4.3, 6.2, 6.3, 6.4_

  - [ ]* 7.4 Write unit tests for the Stories frontmatter helpers
    - Given a mock `entries` array, assert sort-by-`order`, `featured` selection with `entries[0]` fallback, `featuredList` shape, and `featuredIndex`
    - **Property 9: Collection ordering total**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

  - [ ]* 7.5 Write a property test for the featured rotator index wrap
    - For `featuredList.length = n > 1`, pressing next/prev advances the index as `(i ± 1 + n) % n` and updates photo/label/name/tag/para/link/counter
    - **Property 6: Featured rotator invariance**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 8. Checkpoint - page rebuilds
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 9. Add progressive-enhancement and reduced-motion safety tests
  - [ ]* 9.1 Write a property test for trigger progressive enhancement
    - For every `[data-open-inquire]` trigger, assert it also has `href="/inquire"` (no JS-only CTA)
    - **Property 2: Progressive enhancement never hides content**
    - **Validates: Requirements 10.4, 11.2, 11.3**

  - [ ]* 9.2 Write a test for reduced-motion safety on the rebuilt pages
    - With `prefers-reduced-motion: reduce`, assert `initMotion` registers zero tweens and the reveal safety-net forces every `[data-reveal]` to its visible resting state
    - **Property 7: Reduced motion safety**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 10. Final wiring + build verification
  - [ ] 10.1 Run `astro build` and confirm the Codex migration is clean
    - Verify `npx astro build` succeeds with the rebuilt Experience and Stories pages carrying no `global.css` `.ex-*` / `.ms-*` dependency, and that `Pic` emits `<picture>` for imported assets
    - Confirm the Sveltia CMS schema, image pipeline, AC Lambda contract, `PUBLIC_AC_FORM_ENDPOINT`, shared `Header`, and `:root` tokens are unchanged
    - **Property 8: Images are responsive & non-upscaled**
    - _Requirements: 6.3, 6.4, 14.1, 14.2, 14.3, 14.5_

  - [ ]* 10.2 Verify the /inquire fallback banner path
    - Assert the `/inquire` page still reads `?sent=1` / `?sent=0` on load and renders the corresponding success/error banner (unchanged behavior)
    - _Requirements: 11.1, 11.4_

- [ ] 11. Final checkpoint - full suite
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP.
- Each task references specific granular sub-requirements for traceability.
- Property tests validate the design's universal correctness properties; unit
  and DOM tests cover specific examples and edge cases.
- The environment runs `npx astro build` and vitest only — there is no dev or
  preview server, so all behavioral checks are automated (jsdom / fast-check).
- Part B (dialog + triggers) lands before Part A page rebuilds so the Experience
  and Stories CTAs wire into an already-working dialog.
- `global.css` legacy `.ex-*`/`.ms-*` cleanup is intentionally deferred (design
  OQ-5) and is not part of this plan.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "3.2", "5.1"] },
    { "id": 1, "tasks": ["2.1", "6.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "6.2", "7.2"] },
    { "id": 3, "tasks": ["2.4", "7.3"] },
    { "id": 4, "tasks": ["2.5", "3.3", "7.4", "7.5"] },
    { "id": 5, "tasks": ["9.1", "9.2"] },
    { "id": 6, "tasks": ["10.1", "10.2"] }
  ]
}
```
