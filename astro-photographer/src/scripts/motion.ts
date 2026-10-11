/**
 * Shared motion + navigation layer for the Codex-look pages (home + portfolio).
 *
 * Ported from the Codex static site's `js/main.js`. This is a client module
 * bundled and deferred by Astro.
 *
 * Progressive-enhancement contract (mirrors the Codex guarantee):
 *  - If the `gsap` import/registration fails, `initMotion` returns early and
 *    leaves all static content visible — nothing is ever hidden by JS.
 *  - If `prefers-reduced-motion: reduce` matches, ZERO tweens are registered;
 *    elements stay at their natural position/opacity.
 *
 * NOTE: the Codex `CONFIG.contactEmail` + mailto/consultation logic is
 * intentionally NOT ported (D7) — the real ActiveCampaign backend wins.
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/**
 * Motion tuning. Durations in seconds, distances in pixels, `scrollStart` is a
 * ScrollTrigger start position. Values mirror the Codex `CONFIG` defaults.
 */
export interface MotionConfig {
  /** Hero image/line entrance duration (seconds). */
  heroDuration: number;
  /** Per-line stagger within the hero headline (seconds). */
  heroStagger: number;
  /** Fade-up duration for `[data-reveal]` elements (seconds). */
  revealDuration: number;
  /** Vertical travel for a desktop `[data-reveal]` fade-up (pixels). */
  revealDistance: number;
  /** ScrollTrigger start position for `[data-reveal]` elements. */
  scrollStart: string;
  /** Peak-to-peak parallax travel for desktop `[data-parallax]` images (pixels). */
  desktopParallax: number;
}

/** Codex CONFIG defaults, frozen so callers cannot mutate the shared baseline. */
export const CONFIG: Readonly<MotionConfig> = Object.freeze({
  heroDuration: 1.2,
  heroStagger: 0.13,
  revealDuration: 0.85,
  revealDistance: 26,
  scrollStart: 'top 88%',
  desktopParallax: 35,
});

const $$ = <E extends Element = Element>(
  selector: string,
  parent: ParentNode = document,
): E[] => [...parent.querySelectorAll<E>(selector)];

/**
 * Register the Codex motion system (hero timeline, scroll reveals, desktop
 * parallax). Safe to call once per page.
 *
 * - Imports `gsap`/`ScrollTrigger` from the npm package and registers the
 *   plugin. If either step throws, the function returns early with content
 *   left visible (Requirement 5.4).
 * - Honors `prefers-reduced-motion: reduce` by registering no tweens
 *   (Requirement 5.1); the reduced branch of `gsap.matchMedia` returns before
 *   any `gsap.from`/`gsap.fromTo` runs.
 */
export function initMotion(cfg: Partial<MotionConfig> = {}): void {
  const config: MotionConfig = { ...CONFIG, ...cfg };

  // Guard the whole plugin registration: if gsap or ScrollTrigger is missing
  // or registration throws, bail out and leave the static page readable.
  try {
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    return;
  }

  const media = gsap.matchMedia();
  media.add(
    {
      desktop: '(min-width: 769px)',
      mobile: '(max-width: 768px)',
      reduced: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const conditions = context.conditions as
        | { desktop: boolean; mobile: boolean; reduced: boolean }
        | undefined;
      // Reduced motion: register ZERO tweens; natural position/opacity stays.
      if (!conditions || conditions.reduced) return;
      const { desktop } = conditions;

      // Hero entrance timeline: image scale-in, headline line stagger, items.
      const heroImage = document.querySelector<HTMLElement>(
        '.hero__image, [data-hero-image]',
      );
      const lines = $$<HTMLElement>('[data-hero-line]');
      const supporting = $$<HTMLElement>('[data-hero-item]');
      const entrance = gsap.timeline({ defaults: { ease: 'power2.out' } });
      if (heroImage) {
        entrance.from(
          heroImage,
          { opacity: 0, scale: 1.045, duration: config.heroDuration + 0.4 },
          0,
        );
      }
      if (lines.length) {
        entrance.from(
          lines,
          {
            opacity: 0,
            y: desktop ? 32 : 20,
            duration: config.heroDuration,
            stagger: config.heroStagger,
          },
          0.2,
        );
      }
      if (supporting.length) {
        entrance.from(
          supporting,
          { opacity: 0, y: 14, duration: 0.8, stagger: 0.15 },
          0.7,
        );
      }

      // Scroll reveals: each [data-reveal] fades up once at scrollStart.
      // Fail-safe: use fromTo with an explicit visible end state, and
      // toggleActions so an element already past the start on load is still
      // revealed. A separate load-time net (below) force-shows anything that
      // somehow never triggered, so content can never get stuck invisible.
      $$<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: desktop ? config.revealDistance : 16 },
          {
            opacity: 1,
            y: 0,
            duration: config.revealDuration,
            ease: 'power2.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: element,
              start: config.scrollStart,
              toggleActions: 'play none none none',
              once: true,
            },
          },
        );
      });

      // Desktop-only parallax scrub on [data-parallax] images.
      if (desktop) {
        $$<HTMLElement>('[data-parallax]').forEach((element) => {
          const image = element.matches('img')
            ? element
            : element.querySelector<HTMLElement>('img');
          if (!image) return;
          gsap.fromTo(
            image,
            { y: -config.desktopParallax / 2 },
            {
              y: config.desktopParallax / 2,
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            },
          );
        });
      }

      return () => {
        // matchMedia cleanup is handled by gsap when the context is reverted.
      };
    },
  );

  // Re-measure once fonts settle and after full load so triggers line up.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  // Safety net: after load + a tick, force any [data-reveal] still stuck at
  // opacity 0 (trigger never fired, fast scroll, capture tools, etc.) to its
  // visible resting state. Content is never left invisible.
  const revealSafetyNet = () => {
    ScrollTrigger.refresh();
    $$<HTMLElement>('[data-reveal]').forEach((el) => {
      if (parseFloat(getComputedStyle(el).opacity) < 0.99) {
        gsap.set(el, { opacity: 1, y: 0, clearProps: 'transform' });
      }
    });
  };
  window.addEventListener('load', () => setTimeout(revealSafetyNet, 1200), { once: true });
}

/**
 * Wire the mobile navigation: menu toggle button and Escape-to-close.
 *
 * Targets the Codex masthead contract exposed by `Header.astro`:
 *  - `#menu-toggle`  — the hamburger button (`aria-expanded` / `aria-label`).
 *  - `#primary-nav`  — the navigation container (`.is-open` when expanded).
 *  - `body.menu-open` reflects the open state for scroll locking.
 *
 * Safe to call when the elements are absent (legacy pages): every lookup is
 * optional-chained, so nothing throws.
 */
export function initNav(): void {
  const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const navigation = document.querySelector<HTMLElement>('#primary-nav');

  const closeNavigation = (): void => {
    const restoreFocus =
      !!navigation?.contains(document.activeElement) &&
      !!menuToggle?.getClientRects().length;
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    navigation?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    if (restoreFocus) menuToggle?.focus({ preventScroll: true });
  };

  menuToggle?.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute(
      'aria-label',
      expanded ? 'Close navigation' : 'Open navigation',
    );
    navigation?.classList.toggle('is-open', expanded);
    document.body.classList.toggle('menu-open', expanded);
  });

  // Close after following an in-page nav link.
  $$<HTMLAnchorElement>('a[href^="#"]', navigation ?? document).forEach((link) =>
    link.addEventListener('click', closeNavigation),
  );

  // Escape always closes an open mobile menu.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation();
  });

  // Growing to desktop width tears the mobile menu down.
  window
    .matchMedia('(min-width: 769px)')
    .addEventListener('change', (event) => {
      if (event.matches) closeNavigation();
    });
}
