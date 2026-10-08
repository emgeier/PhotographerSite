# Glam Muse Series — Elementor Build Spec

Goal: rebuild the Home page in WordPress + Elementor so the client can swap
**photos, videos, and text** without touching layout. Build the editable pieces
as native Elementor widgets (Heading, Image, Video, Button); lock all layout
values (section heights, margins, columns) to the numbers below.

All values are the measured, design-matched values from the Astro build. Design
reference width: **1440px desktop**.

---

## 1. One-time WordPress / Elementor setup

### Fonts (Adobe Typekit)
- Kit ID: **`mdr5myc`** (contains `ivypresto-display` weights 100/300/400/600/700 + `ivypresto-text`).
- Easiest: install a plugin such as **"Custom Adobe Fonts"** (official Elementor-compatible) and enter the kit ID. It registers the Adobe families in Elementor's font picker.
- Alternative: add this to the theme `<head>` (via a header-scripts plugin or child theme):
  `<link rel="stylesheet" href="https://use.typekit.net/mdr5myc.css">`
- Body font **Manrope** is on Google Fonts (built into Elementor).

### Global Colors (Elementor → Site Settings → Global Colors)
| Name | Hex | Use |
|---|---|---|
| Ink | `#171717` | text, dark sections, buttons |
| Ivory | `#F4F0E8` | hero + final CTA background |
| White | `#FAF9F6` | page / light-section background |
| Taupe | `#A99888` | rules, step numbers, accents |
| Gold | `#B89C74` | subtle gradient accent |
| Stone | `#D7CEC4` | optional |

### Global Fonts (Elementor → Site Settings → Global Fonts)
| Name | Family | Weight | Notes |
|---|---|---|---|
| Display XL | ivypresto-display | 100 (Thin) | big headings |
| Display Body | ivypresto-display | 300 (Light) | small serif body copy |
| Eyebrow | Manrope | 600 | all-caps labels, letter-spacing 0.28em |
| Body | Manrope | 400 | paragraphs |

### Global layout
- Content width (Site Settings → Layout → Content Width): **1110px**.
  This produces ~165px side margins at 1440px, matching the design.
- Page background: White `#FAF9F6`.

---

## 2. Type scale (desktop)

Apply per widget. Family = ivypresto-display unless noted. `ls` = letter-spacing.

| Element | Size | Weight | Line-height | ls |
|---|---|---|---|---|
| Hero title | 72px (4.5rem) | 100 | 0.91 | -0.035em |
| "Look Again." | 112px (7rem) | 100 | 0.95 | -0.035em |
| Experience H2 "Not transformed, revealed." | 48px (3rem) | 100 | 1.0 | -0.035em |
| Step number 01/02/03 | 86px (5.4rem) | 100 | normal | — |
| Step title (CONSULTATION…) | 14px (0.9rem) | 400 | normal | 0.18em |
| Muse Stories H2 | 29px (1.8rem) | 400 | normal | 0.2em |
| Final CTA "Your Turn." | 84px (5.25rem) | 100 | normal | -0.035em |
| Brand "GLAM MUSE" | 34px (2.1rem) | 100 | 1.0 | 0.04em |
| Eyebrow labels | ~11.5px (0.72rem) | 600 Manrope | normal | 0.28em, UPPERCASE |
| Body paragraphs | 16px | 400 Manrope | 1.5 | — |
| Buttons | ~9px (0.57rem) | 700 Manrope | — | 0.2em, UPPERCASE |

---

## 3. Section-by-section widget map

Build each as an Elementor **Section** (or Container). "Editable" = what the
client will change. "Lock" = set once, don't expose.

### Header (sticky, z-index 3) — height 112px
- **Logo** (3 stacked lines): use an HTML widget or a Heading stack:
  - line 1 `THE` — Manrope, 0.61rem, ls 0.38em
  - line 2 `GLAM MUSE` — ivypresto-display 100, 2.1rem, ls 0.04em, **margin 3px 0 7px** (this evens the gaps)
  - line 3 `SERIES` — Manrope, 0.61rem, ls 0.38em
  - container: flex column, center, line-height 1, width 180px
- **Nav**: Manrope 0.58rem, weight 650, ls 0.23em, UPPERCASE, gap 30px.
- **Contact button**: 1px ink border, padding 14px 22px.

### Hero — section height **765px**, background Ivory, `overflow:hidden`
- Left column (content), padding-top 68px:
  - **Hero title** (editable text) — 72px per scale, margin 0 0 30px
  - **Eyebrow** "YOUR BEAUTY. REDISCOVERED." (editable), margin-bottom 26px
  - **Button** "Begin your transformation" (editable label + link)
- **Hero image/video** (editable): absolute, right 0 bottom 0, width 60%, height 86%, `object-fit:cover`. For video, use Elementor Video widget set to cover, autoplay/muted/loop.

### Look Again (intro) — section min-height **586px**, bg White, padding-block 72px
- 2-column: **42% / 58%**, vertical-center.
- Left: **Image** (editable), 350×410, object-fit cover, centered.
- Right (centered text):
  - **"Look Again."** 112px
  - Eyebrow "A FRESH PERSPECTIVE."
  - Rule: 52px × 1px, Taupe, margin 20px auto
  - Eyebrow "YOU. IN FULL."
  - **Button** "Explore the portfolio"

### The Experience — bg Ink, text White, padding **92px 0 128px**
- Optional radial gradient overlay: `radial-gradient(ellipse at 50% 110%, rgba(184,156,116,.23), transparent 58%)` (HTML/CSS or section background overlay).
- Head row: 2fr / 1fr grid, gap 100px, align end:
  - Left: eyebrow "THE EXPERIENCE" + **H2 "Not transformed, revealed."** (48px)
  - Right: paragraph (editable), ivypresto-display 300, 1.05rem, line-height 1.25
- Steps: 3 columns, gap 80px, margin-top 36px. Each:
  - **Number** 01/02/03 — 86px, Taupe, weight 100
  - Rule 48px × 1px Taupe, margin 6px 0 20px
  - **Title** (CONSULTATION…) — 0.9rem, weight 400, ls 0.18em
  - **Paragraph** (editable) — ivypresto-display 300, line-height 1.35

### Muse Stories — bg White, text center, padding **58px 0 54px**
- **H2 "MUSE STORIES"** — 1.8rem, weight 400, ls 0.2em, margin 0 0 14px
- Eyebrow "EVERY WOMAN. A STORY WORTH SEEING."
- Grid: 3 columns, gap 65px, margin-top 30px. Each card (editable):
  - **Image** — width 100%, aspect-ratio 4/5, object-fit cover
  - **Title** — UPPERCASE, 0.58rem, ls 0.22em, margin-top 18px
  - Rule 42px × 1px Ink, margin 14px auto
- **Text link** "View all stories →" — right-aligned, 0.55rem, weight 700, ls 0.18em

### Final CTA — section height **365px**, bg Ivory, overflow hidden
- Content left, vertical-center:
  - **"Your Turn."** 84px
  - Rule (left-aligned) 52px × 1px Taupe, margin 8px 0 18px
  - Eyebrow "A PORTRAIT EXPERIENCE / CREATED FOR YOU."
  - **Button** "Begin your consultation"
- **Image/video** (editable): absolute right 0 top 0, width 52%, height 100%, cover.

### Footer — bg Ink, text White, padding **72px 0 62px**
- Row 1 (space-between, border-bottom 1px #494642, padding-bottom 25px):
  - Brand (light, strong 1.45rem) + nav
- Row 2 (space-between, padding-top 18px, 0.5rem, ls 0.12em):
  - "© 2026 THE GLAM MUSE SERIES. ALL RIGHTS RESERVED." + tagline

---

## 4. Responsive (set in Elementor's tablet/mobile toggles)

Tablet (≤850 / Elementor "Tablet"):
- Content width ~720px; hero title 3.75rem; "Look Again." 5rem; CTA 4.25rem.
- Intro → 2 equal columns; experience steps gap 30px; story grid gap 24px.
- Hide main nav links (keep Contact button) — matches original.

Mobile (≤600 / Elementor "Mobile"):
- Hero title 3.4rem; "Look Again." 4.25rem; CTA 3.75rem; steps numbers 4.5rem.
- Intro, experience head, steps, story grid all → single column.
- Hero image → full width, bottom; final CTA image → full width bottom.
- Footer stacks (brand, nav, meta centered).

---

## 5. Locking the layout for the client

- Put editable text in **Heading/Text widgets**, editable media in **Image/Video widgets** — these are click-to-edit.
- Set all section heights, paddings, column widths, and font styles once; the client changing a photo or a sentence will not move them.
- Consider Elementor's **role-based editing** / lock widgets, or build the shell as a **Template** and expose only content widgets, so structure can't be dragged out of place.
- Keep `object-fit: cover` on all media so swapped photos/videos of any size fill their frame without distorting the layout.

---

## 6. Verifying the Elementor build matches the design

The existing Playwright harness in `visual/` still works against WordPress:
1. Point it at the live/staging WP URL: `PREVIEW_URL=https://staging.example.com npm run visual:capture && npm run visual:report`
2. Open `visual/out/index.html` to see the Elementor render beside `Home Page.png`.
3. The computed-style audit table will flag any font/size/margin drift so you can
   fix it in Elementor to match these specs exactly.
