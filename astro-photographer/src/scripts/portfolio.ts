/**
 * Portfolio client motion + interaction layer for the Codex-look portfolio page.
 *
 * Ported from the Codex static site's `js/portfolio.js`. This is a client
 * module bundled and deferred by Astro.
 *
 * This file hosts three independent exports:
 *   - `initPortfolioGrid()` — grid row reveals, desktop image drift, and
 *     pointer-driven parallax (THIS task, 6.1).
 *   - `initLightbox()`        — native `<dialog>` gallery (task 6.2, appended later).
 *   - `initExperienceVideo()` — privacy-preserving YouTube lifecycle (task 6.4).
 *
 * Each export is self-contained and may be called independently; they share the
 * `gsap` import below and the `$$` querySelectorAll helper. Keep that contract
 * when appending `initLightbox` / `initExperienceVideo`.
 *
 * Progressive-enhancement contract (mirrors the Codex guarantee and motion.ts):
 *  - If the `gsap` import/registration fails, `initPortfolioGrid` returns early
 *    and leaves all static content visible — nothing is ever hidden by JS.
 *  - If `prefers-reduced-motion: reduce` matches, ZERO tweens are registered and
 *    the pointer drift is never wired; cards stay at natural position/opacity.
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/** Shared querySelectorAll helper (array form). Reused by later exports. */
const $$ = <E extends Element = Element>(
  selector: string,
  parent: ParentNode = document,
): E[] => [...parent.querySelectorAll<E>(selector)];

/**
 * Portfolio motion tuning. Durations in seconds, distances in pixels. Values
 * mirror the Codex `MOTION` defaults from `js/portfolio.js`.
 */
export interface PortfolioMotion {
  /** Card/row reveal duration (seconds). */
  rowDuration: number;
  /** Per-column stagger across a row (seconds). */
  rowStagger: number;
  /** Vertical travel for a desktop card reveal (pixels). */
  revealDistance: number;
  /** Peak-to-peak desktop image drift on scroll (pixels). */
  imageDrift: number;
  /** Horizontal pointer-driven parallax travel (pixels). */
  pointerDrift: number;
}

/** Codex `MOTION` defaults, frozen so callers cannot mutate the baseline. */
export const PORTFOLIO_MOTION: Readonly<PortfolioMotion> = Object.freeze({
  rowDuration: 1.05,
  rowStagger: 0.09,
  revealDistance: 22,
  imageDrift: 14,
  pointerDrift: 4,
});

/**
 * Register the Codex portfolio grid motion: per-card row reveals, an optional
 * image-frame clip reveal, desktop-only vertical image drift on scroll, and
 * pointer-driven horizontal parallax on fine pointers.
 *
 * Selectors match the Codex portfolio markup (what `portfolio.astro` renders):
 *  - cards:  `[data-portfolio-index]` (the grid is `cards[0].parentElement`)
 *  - frame:  `[data-portrait-frame]` or `.image-frame` within a card
 *  - image:  `img` within a card
 *
 * - Imports `gsap`/`ScrollTrigger` from the npm package and registers the
 *   plugin. If either step throws, the function returns early with content
 *   left visible (Requirement 5.4).
 * - Guards an empty grid: `if (!cards.length) return;` (Requirement 6.6).
 * - Honors `prefers-reduced-motion: reduce` by registering no tweens and never
 *   wiring pointer drift (Requirement 5.1); the reduced branch of
 *   `gsap.matchMedia` returns before any `gsap.from`/`gsap.fromTo` runs.
 */
export function initPortfolioGrid(cfg: Partial<PortfolioMotion> = {}): void {
  const config: PortfolioMotion = { ...PORTFOLIO_MOTION, ...cfg };

  const cards = $$<HTMLElement>('[data-portfolio-index]');
  // Zero-card guard: nothing to animate on an empty grid (Requirement 6.6).
  if (!cards.length) return;

  // Guard the whole plugin registration: if gsap or ScrollTrigger is missing
  // or registration throws, bail out and leave the static page readable.
  try {
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    return;
  }

  const grid = cards[0].parentElement as HTMLElement | null;

  const media = gsap.matchMedia();
  media.add(
    {
      desktop: '(min-width: 769px)',
      narrow: '(max-width: 480px)',
      pointer: '(hover: hover) and (pointer: fine)',
      reduced: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const conditions = context.conditions as
        | {
            desktop: boolean;
            narrow: boolean;
            pointer: boolean;
            reduced: boolean;
          }
        | undefined;
      // Reduced motion: register ZERO tweens; natural position/opacity stays.
      if (!conditions || conditions.reduced) return;
      const { desktop, pointer } = conditions;

      // Column count drives the per-row stagger. Fall back to one column when
      // the grid or its computed template is unavailable.
      const columns = grid
        ? Math.max(
            1,
            getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          )
        : 1;
      const pointerCleanups: Array<() => void> = [];

      cards.forEach((card, index) => {
        const frame =
          card.querySelector<HTMLElement>('[data-portrait-frame]') ??
          card.querySelector<HTMLElement>('.image-frame');
        const image = card.querySelector<HTMLElement>('img');
        const delay = (index % columns) * config.rowStagger;

        gsap.from(card, {
          opacity: 0,
          y: desktop ? config.revealDistance : 14,
          duration: config.rowDuration,
          delay,
          ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 92%', once: true },
        });

        if (frame) {
          gsap.from(frame, {
            clipPath: 'inset(4% 0% 0% 0%)',
            duration: config.rowDuration,
            delay,
            ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 92%', once: true },
          });
        }

        if (desktop && image) {
          gsap.fromTo(
            image,
            { y: -config.imageDrift },
            {
              y: config.imageDrift,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.4,
              },
            },
          );
        }

        // A few pixels of horizontal response feel tactile. Vertical image
        // movement remains controlled by scroll; CSS scale handles hover zoom.
        if (pointer && image) {
          const moveX = gsap.quickTo(image, 'x', {
            duration: 0.75,
            ease: 'power3.out',
          });
          const move = (event: PointerEvent): void => {
            const rect = card.getBoundingClientRect();
            const fraction = Math.max(
              -1,
              Math.min(
                1,
                ((event.clientX - rect.left) / rect.width - 0.5) * 2,
              ),
            );
            moveX(fraction * config.pointerDrift);
          };
          const leave = (): void => {
            moveX(0);
          };
          card.addEventListener('pointermove', move);
          card.addEventListener('pointerleave', leave);
          pointerCleanups.push(() => {
            card.removeEventListener('pointermove', move);
            card.removeEventListener('pointerleave', leave);
          });
        }
      });

      return () => pointerCleanups.forEach((cleanup) => cleanup());
    },
  );

  // Re-measure once fonts settle so triggers line up with final layout.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

// --- initLightbox (task 6.2) and initExperienceVideo (task 6.4) append below ---

/**
 * Normalize a (possibly out-of-range or negative) gallery index into the
 * valid half-open range `[0, len)`, wrapping at both ends.
 *
 * This is the pure math behind `renderGallery`'s index handling (Requirement
 * 6.4 / design Property 6). It is extracted as a standalone export so the
 * wrap behavior can be property-tested in isolation; `renderGallery` calls it
 * so there is a single source of truth for the formula.
 *
 * Formula: `((i % len) + len) % len`. The inner `i % len` keeps magnitude in
 * `(-len, len)`, `+ len` lifts any negative remainder non-negative, and the
 * final `% len` folds the `[0, 2·len)` result back into `[0, len)`. The result
 * is therefore always within `[0, len)` for every integer `i` and `len >= 1`.
 *
 * @param i   any integer index (may be negative or exceed `len`).
 * @param len gallery length; callers must pass `len >= 1`.
 * @returns the wrapped index in `[0, len)`.
 */
export const wrapIndex = (i: number, len: number): number =>
  ((i % len) + len) % len;

/**
 * A single-entry gallery item derived from a `[data-portfolio-index]` card.
 *
 * The markup is the source of truth (Requirement 6.1): each card wraps one
 * `<img>` and carries `data-title` / `data-caption`. We snapshot those values
 * into this shape in DOM order so navigation order equals grid order.
 */
interface GalleryEntry {
  /** `<img>` src from the card's image. */
  image: string;
  /** `<img>` alt text (falls back to the title). */
  alt: string;
  /** `data-title`, falling back to the image alt. */
  title: string;
  /** `data-caption`, falling back to a neutral editorial line. */
  caption: string;
}

/**
 * Wire the native `<dialog>` portfolio gallery ("lightbox").
 *
 * Ported from the Codex gallery logic in `js/main.js` (the lightbox lived in
 * the shared layer, not `js/portfolio.js`). This Astro port is self-contained:
 * it owns its own dialog open/close + focus-return lifecycle rather than
 * depending on a global `GlamMuse.openDialog`, so it can be called in isolation
 * from `portfolio.astro`.
 *
 * DOM contract — `portfolio.astro` (task 10.1) MUST render:
 *  - triggers:  `[data-portfolio-index]` elements (the 9 grid cards), each with
 *               `data-title` + `data-caption`, each wrapping exactly one `<img>`.
 *  - dialog:    `#gallery-dialog` (native `<dialog class="gallery-dialog">`).
 *  - stage img: `#gallery-image` (the `<img class="gallery-stage">` shown).
 *  - title:     `#gallery-title`.
 *  - caption:   `#gallery-caption` (figcaption/caption element).
 *  - count:     `#gallery-count` (rendered `NN / NN`).
 *  - prev btn:  `[data-gallery-prev]` (`.gallery-arrow`).
 *  - next btn:  `[data-gallery-next]` (`.gallery-arrow`).
 *
 * Behavior (Requirement 6.1–6.6):
 *  - `GALLERY` is derived from DOM order of `[data-portfolio-index]` (6.1).
 *  - Opening a card shows image/title/caption and a `NN / NN` count (6.2).
 *  - `←` / `→` keys and touch-swipe beyond ~55px wrap-navigate; Escape closes
 *    via native `<dialog>` behavior (6.3, 6.5).
 *  - `renderGallery(i)` normalizes the index as `(i + len) % len`, so it is
 *    always within `[0, len)` and wraps at both ends (6.4).
 *  - Zero-card guard: with no triggers, return without wiring (6.6).
 *  - Exactly one dialog open at a time; `body.dialog-open` reflects open state
 *    (matches the Codex `body.dialog-open{overflow:hidden}` rule).
 *  - On close, focus returns to the invoking trigger (6.5).
 *  - TypeScript strict-friendly: every lookup is null-guarded and the function
 *    no-ops safely when the dialog or any required element is absent.
 */
export function initLightbox(): void {
  const triggers = $$<HTMLElement>('[data-portfolio-index]');
  // Zero-card guard: nothing to wire on an empty grid (Requirement 6.6).
  if (!triggers.length) return;

  const dialog = document.querySelector<HTMLDialogElement>('#gallery-dialog');
  const image = document.querySelector<HTMLImageElement>('#gallery-image');
  // Title is OPTIONAL: the dialog may omit the per-image title line and keep
  // only the static collection eyebrow + the caption.
  const titleEl = document.querySelector<HTMLElement>('#gallery-title');
  const captionEl = document.querySelector<HTMLElement>('#gallery-caption');
  const countEl = document.querySelector<HTMLElement>('#gallery-count');
  // If the dialog or any required stage element is missing, no-op safely.
  // (titleEl is intentionally not required.)
  if (!dialog || !image || !captionEl || !countEl) return;

  // Markup is the source of truth (Requirement 6.1): snapshot the cards in DOM
  // order so the gallery order equals the grid order.
  const GALLERY: GalleryEntry[] = triggers.map((card) => {
    const img = card.querySelector<HTMLImageElement>('img');
    const src = img?.getAttribute('src') ?? '';
    const alt = img?.alt ?? '';
    return {
      image: src,
      alt,
      title: card.dataset.title ?? alt,
      caption:
        card.dataset.caption ?? 'The Glam Muse Experience · Editorial preview',
    };
  });
  const len = GALLERY.length;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let galleryIndex = 0;
  let galleryTween: gsap.core.Tween | undefined;
  let lastTrigger: HTMLElement | null = null;

  // Pad a 1-based position to the Codex `NN` form (e.g. `03`).
  const pad = (n: number): string => String(n).padStart(2, '0');

  /**
   * Show the entry at `index`, normalizing it as `(index + len) % len` so the
   * displayed index is always within `[0, len)` and wraps at both ends
   * (Requirement 6.4). The optional cross-fade is skipped under reduced motion.
   */
  function renderGallery(index: number, animate = false): void {
    galleryIndex = wrapIndex(index, len);
    const entry = GALLERY[galleryIndex];
    galleryTween?.kill();
    // `image`, `captionEl`, `countEl` are proven non-null above; titleEl is optional.
    const stage = image as HTMLImageElement;
    try {
      gsap?.set(stage, { opacity: 1, scale: 1 });
    } catch {
      /* gsap missing or failed: static image still renders. */
    }
    stage.src = entry.image;
    stage.alt = entry.alt;
    // Title is optional — only write it when the element is present.
    if (titleEl) titleEl.textContent = entry.title;
    (captionEl as HTMLElement).textContent = entry.caption;
    (countEl as HTMLElement).textContent = `${pad(galleryIndex + 1)} / ${pad(len)}`;
    if (animate && !reducedMotion.matches) {
      try {
        galleryTween = gsap.fromTo(
          stage,
          { opacity: 0.25, scale: 0.995 },
          { opacity: 1, scale: 1, duration: 0.6, ease: 'power1.out' },
        );
      } catch {
        /* no-op: animation is a progressive enhancement. */
      }
    }
  }

  /**
   * Open the gallery dialog, enforcing a single open dialog at a time and
   * tracking the trigger to restore focus to on close (Requirement 6.5).
   */
  function openGallery(trigger: HTMLElement): void {
    if (dialog!.open) return;
    const active = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (active) active.close();
    lastTrigger = trigger;
    dialog!.showModal();
    document.body.classList.add('dialog-open');
  }

  // Each card opens the gallery at its own DOM index.
  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const explicit = Number(trigger.dataset.portfolioIndex);
      renderGallery(Number.isNaN(explicit) ? index : explicit);
      openGallery(trigger);
    });
  });

  // Native dialog close: drop the body lock and return focus to the trigger.
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
    }
    if (lastTrigger?.isConnected) {
      lastTrigger.focus({ preventScroll: true });
    }
  });

  // Prev/next arrow buttons (optional in markup; guarded).
  document
    .querySelector<HTMLElement>('[data-gallery-prev]')
    ?.addEventListener('click', () => renderGallery(galleryIndex - 1, true));
  document
    .querySelector<HTMLElement>('[data-gallery-next]')
    ?.addEventListener('click', () => renderGallery(galleryIndex + 1, true));

  // Left/Right arrow keys wrap-navigate; Escape is handled natively by <dialog>.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      renderGallery(
        galleryIndex + (event.key === 'ArrowRight' ? 1 : -1),
        true,
      );
    }
  });

  // Touch-swipe beyond ~55px wrap-navigates (left swipe → next, right → prev).
  const SWIPE_THRESHOLD = 55;
  let touchStartX: number | null = null;
  image.addEventListener(
    'touchstart',
    (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    },
    { passive: true },
  );
  image.addEventListener(
    'touchend',
    (event) => {
      if (touchStartX === null) return;
      const endX = event.changedTouches[0]?.clientX ?? touchStartX;
      const delta = endX - touchStartX;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        renderGallery(galleryIndex + (delta < 0 ? 1 : -1), true);
      }
      touchStartX = null;
    },
    { passive: true },
  );
}

// --- initStoryGallery (story-detail mosaic lightbox) ------------------------

/**
 * Wire a native `<dialog>` lightbox for the story-detail mosaic, reusing the
 * same single-dialog invariant, focus-return, keyboard + swipe navigation, and
 * `body.dialog-open` contract as `initLightbox` — but driven by generic
 * `[data-gallery-item]` triggers so it is decoupled from the portfolio grid.
 *
 * DOM contract — `stories/[slug].astro` renders:
 *  - triggers:  `[data-gallery-item]` elements (the mosaic tiles), each wrapping
 *               one `<img>` and optionally carrying `data-caption`.
 *  - dialog:    `#st-gallery-dialog` (native `<dialog class="gallery-dialog">`).
 *  - stage img: `#st-gallery-image`.
 *  - caption:   `#st-gallery-caption` (figcaption) — OPTIONAL.
 *  - count:     `#st-gallery-count` (rendered `NN / NN`).
 *  - prev btn:  `[data-st-gallery-prev]`.
 *  - next btn:  `[data-st-gallery-next]`.
 *
 * Mirrors the simplified portfolio popup: a static collection eyebrow + a
 * per-image caption, no per-image title line. Safe no-op when the dialog or
 * triggers are absent.
 */
export function initStoryGallery(): void {
  const triggers = $$<HTMLElement>('[data-gallery-item]');
  if (!triggers.length) return;

  const dialog = document.querySelector<HTMLDialogElement>('#st-gallery-dialog');
  const image = document.querySelector<HTMLImageElement>('#st-gallery-image');
  const captionEl = document.querySelector<HTMLElement>('#st-gallery-caption');
  const countEl = document.querySelector<HTMLElement>('#st-gallery-count');
  // Dialog + stage image + count are required; caption is optional.
  if (!dialog || !image || !countEl) return;

  // Snapshot the tiles in DOM order so gallery order equals mosaic order.
  const GALLERY = triggers.map((tile) => {
    const img = tile.querySelector<HTMLImageElement>('img');
    return {
      image: img?.getAttribute('src') ?? '',
      alt: img?.alt ?? '',
      caption: tile.dataset.caption ?? '',
    };
  });
  const len = GALLERY.length;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let galleryIndex = 0;
  let galleryTween: gsap.core.Tween | undefined;
  let lastTrigger: HTMLElement | null = null;
  const pad = (n: number): string => String(n).padStart(2, '0');

  function renderGallery(index: number, animate = false): void {
    galleryIndex = wrapIndex(index, len);
    const entry = GALLERY[galleryIndex];
    galleryTween?.kill();
    const stage = image as HTMLImageElement;
    try {
      gsap?.set(stage, { opacity: 1, scale: 1 });
    } catch {
      /* gsap missing: static image still renders. */
    }
    stage.src = entry.image;
    stage.alt = entry.alt;
    if (captionEl) captionEl.textContent = entry.caption;
    (countEl as HTMLElement).textContent = `${pad(galleryIndex + 1)} / ${pad(len)}`;
    if (animate && !reducedMotion.matches) {
      try {
        galleryTween = gsap.fromTo(
          stage,
          { opacity: 0.25, scale: 0.995 },
          { opacity: 1, scale: 1, duration: 0.6, ease: 'power1.out' },
        );
      } catch {
        /* no-op: animation is a progressive enhancement. */
      }
    }
  }

  function openGallery(trigger: HTMLElement): void {
    if (dialog!.open) return;
    // Single open dialog at a time: close any other open dialog first.
    const active = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (active && active !== dialog) active.close();
    lastTrigger = trigger;
    dialog!.showModal();
    document.body.classList.add('dialog-open');
  }

  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      renderGallery(index);
      openGallery(trigger);
    });
  });

  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
    }
    if (lastTrigger?.isConnected) {
      lastTrigger.focus({ preventScroll: true });
    }
  });

  document
    .querySelector<HTMLElement>('[data-st-gallery-prev]')
    ?.addEventListener('click', () => renderGallery(galleryIndex - 1, true));
  document
    .querySelector<HTMLElement>('[data-st-gallery-next]')
    ?.addEventListener('click', () => renderGallery(galleryIndex + 1, true));

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      renderGallery(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  });

  // Touch-swipe beyond ~55px wrap-navigates (left swipe → next, right → prev).
  const SWIPE_THRESHOLD = 55;
  let touchStartX: number | null = null;
  image.addEventListener(
    'touchstart',
    (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    },
    { passive: true },
  );
  image.addEventListener(
    'touchend',
    (event) => {
      if (touchStartX === null) return;
      const endX = event.changedTouches[0]?.clientX ?? touchStartX;
      const delta = endX - touchStartX;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        renderGallery(galleryIndex + (delta < 0 ? 1 : -1), true);
      }
      touchStartX = null;
    },
    { passive: true },
  );
}

// --- initExperienceVideo (task 6.4) -----------------------------------------

/**
 * YouTube video id for the studio experience film (Codex direct link
 * https://www.youtube.com/watch?v=yr74CtwKoEk). Kept as a bare id so the
 * privacy-preserving `youtube-nocookie` embed URL can be assembled on demand.
 */
export const EXPERIENCE_VIDEO_ID = 'yr74CtwKoEk';

/**
 * Build the privacy-enhanced `youtube-nocookie` embed URL for the experience
 * film. The URL is assembled ON DEMAND (at click time) so that no request is
 * ever made to YouTube on page load (Requirement 7.1, 7.2).
 *
 * Params:
 *  - `rel=0`            — restrict related videos to the same channel.
 *  - `playsinline=1`    — inline playback on iOS instead of fullscreen takeover.
 *  - `modestbranding=1` — minimal YouTube branding in the player chrome.
 *  - `autoplay=0|1`     — 0 under `prefers-reduced-motion: reduce`, else 1
 *                         (Requirement 7.3). Pass `reducedMotion` explicitly so
 *                         the value is read at click time, not at module load.
 *
 * @param reducedMotion whether `(prefers-reduced-motion: reduce)` matches now.
 * @returns the full `https://www.youtube-nocookie.com/embed/<id>?...` URL.
 */
export function buildExperienceVideoSrc(reducedMotion: boolean): string {
  const params = new URLSearchParams({
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
    autoplay: reducedMotion ? '0' : '1',
  });
  return `https://www.youtube-nocookie.com/embed/${EXPERIENCE_VIDEO_ID}?${params.toString()}`;
}

/**
 * Wire the privacy-preserving experience-film dialog on the portfolio page.
 *
 * Ported from the YouTube lifecycle at the bottom of the Codex
 * `js/portfolio.js`. The Codex version delegated open/close to a global
 * `GlamMuse.openDialog`; this Astro port owns its own native `<dialog>`
 * open/close + focus-return lifecycle instead (same single-dialog invariant and
 * `body.dialog-open` contract as `initLightbox`), so it can be called in
 * isolation from `portfolio.astro`.
 *
 * DOM contract — `portfolio.astro` (task 10.1) MUST render:
 *  - dialog:    `#experience-dialog` (native `<dialog>`).
 *  - iframe:    `#experience-video` (an `<iframe>` INSIDE `#experience-dialog`,
 *               initially with no YouTube `src` — e.g. `src="about:blank"` or
 *               no `src` — so nothing loads until the visitor opts in).
 *  - trigger(s):`[data-open-experience]` (one or more "watch the film" buttons/
 *               links anywhere on the page).
 *  - close:     a close control that dismisses the native dialog (e.g. a
 *               `<form method="dialog">` submit button, or `formmethod="dialog"`
 *               button); Escape also closes it natively.
 *
 * Behavior (Requirement 7.1–7.4):
 *  - No request to YouTube until a `[data-open-experience]` trigger is activated
 *    (7.1). The iframe `src` is only set inside the click handler.
 *  - On activation, the `youtube-nocookie` embed `src` is built on demand via
 *    `buildExperienceVideoSrc` (7.2) with `autoplay` reflecting reduced motion
 *    at click time (7.3).
 *  - On the dialog `close` event, the iframe `src` is reset to `about:blank` to
 *    stop playback (7.4).
 *  - Opening uses the native `<dialog>.showModal()`, enforces one open dialog at
 *    a time, sets `body.dialog-open`, clears it on close, and returns focus to
 *    the invoking trigger on close (consistent with `initLightbox`).
 *  - TypeScript strict-friendly: a safe no-op when `#experience-dialog` or the
 *    `#experience-video` iframe is absent.
 */
export function initExperienceVideo(): void {
  const dialog = document.querySelector<HTMLDialogElement>(
    '#experience-dialog',
  );
  const video = dialog?.querySelector<HTMLIFrameElement>('#experience-video');
  // Safe no-op if the dialog or its iframe is absent (Requirement guard).
  if (!dialog || !video) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastTrigger: HTMLElement | null = null;

  // Each trigger opens the dialog and loads the film ON DEMAND. Nothing is
  // requested from YouTube until this handler runs (Requirement 7.1).
  $$<HTMLElement>('[data-open-experience]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      if (dialog.open) return;
      // Single open dialog at a time: close any other dialog first.
      const active = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (active && active !== dialog) active.close();
      lastTrigger = trigger;
      dialog.showModal();
      document.body.classList.add('dialog-open');
      // Build the youtube-nocookie src now, reading reduced motion at click
      // time so autoplay reflects the current preference (Requirement 7.2/7.3).
      video.src = buildExperienceVideoSrc(reducedMotion.matches);
    });
  });

  // On close: stop playback by blanking the iframe (Requirement 7.4), drop the
  // body lock, and return focus to the invoking trigger.
  dialog.addEventListener('close', () => {
    video.src = 'about:blank';
    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
    }
    if (lastTrigger?.isConnected) {
      lastTrigger.focus({ preventScroll: true });
    }
  });
}
