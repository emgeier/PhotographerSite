import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the shared motion/navigation layer (`motion.ts`).
 *
 * These tests are hermetic: `gsap` and `gsap/ScrollTrigger` are mocked so no
 * real DOM animation runs. We drive `initMotion` through a mocked
 * `gsap.matchMedia()` and assert which (if any) tweens get registered, and we
 * drive the progressive-enhancement guard by making plugin registration throw.
 */

// --- gsap mock ---------------------------------------------------------------
// A factory-based mock so each test can inspect / reconfigure the calls. The
// `media.add(conditions, cb)` surface is what `initMotion` uses, so we capture
// the callback and let individual tests invoke it with chosen conditions.
const mediaAdd = vi.fn();
const matchMedia = vi.fn(() => ({ add: mediaAdd }));
const registerPlugin = vi.fn();
const timeline = vi.fn(() => {
  const tl: Record<string, unknown> = {};
  tl.from = vi.fn(() => tl);
  tl.fromTo = vi.fn(() => tl);
  return tl;
});
const from = vi.fn();
const fromTo = vi.fn();

vi.mock('gsap', () => {
  const gsap = {
    registerPlugin: (...args: unknown[]) => registerPlugin(...args),
    matchMedia: () => matchMedia(),
    timeline: () => timeline(),
    from: (...args: unknown[]) => from(...args),
    fromTo: (...args: unknown[]) => fromTo(...args),
  };
  return { default: gsap };
});

vi.mock('gsap/ScrollTrigger', () => ({
  default: { refresh: vi.fn() },
}));

// Import AFTER the mocks are registered.
import { initMotion, initNav } from './motion';

/** Install a matchMedia stub on the jsdom window. */
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

beforeEach(() => {
  document.body.innerHTML = '';
  mediaAdd.mockReset();
  matchMedia.mockClear();
  registerPlugin.mockReset();
  timeline.mockClear();
  from.mockReset();
  fromTo.mockReset();
  // Default: matchMedia present and NOT reduced; individual tests override.
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initMotion', () => {
  it('registers ZERO gsap tweens when prefers-reduced-motion matches (Validates: Requirements 5.1)', () => {
    // Seed the DOM with every hook the motion branch would animate, to prove
    // the reduced branch is what suppresses the tweens (not an empty DOM).
    document.body.innerHTML = `
      <div class="hero__image"></div>
      <span data-hero-line>one</span>
      <span data-hero-line>two</span>
      <div data-hero-item>item</div>
      <section data-reveal>reveal</section>
      <figure data-parallax><img src="x.webp" /></figure>
    `;

    // Drive the gsap.matchMedia callback with the reduced condition active.
    mediaAdd.mockImplementation(
      (_conditions: unknown, cb: (ctx: { conditions: unknown }) => void) => {
        cb({ conditions: { desktop: true, mobile: false, reduced: true } });
      },
    );

    initMotion();

    // Reduced motion branch returns before any tween is scheduled.
    expect(from).not.toHaveBeenCalled();
    expect(fromTo).not.toHaveBeenCalled();
    expect(timeline).not.toHaveBeenCalled();
  });

  it('registers tweens in the non-reduced desktop branch (control for the reduced assertion)', () => {
    document.body.innerHTML = `
      <div class="hero__image"></div>
      <span data-hero-line>one</span>
      <section data-reveal>reveal</section>
    `;

    mediaAdd.mockImplementation(
      (_conditions: unknown, cb: (ctx: { conditions: unknown }) => void) => {
        cb({ conditions: { desktop: true, mobile: false, reduced: false } });
      },
    );

    initMotion();

    // Sanity: when NOT reduced, motion actually runs — so the reduced test
    // above is meaningful rather than trivially passing on an inert mock.
    // Hero uses a timeline; reveals use gsap.fromTo (fail-safe pattern).
    expect(timeline).toHaveBeenCalled();
    expect(fromTo).toHaveBeenCalled();
  });

  it('returns early and does not throw when gsap plugin registration throws, leaving content visible (Validates: Requirements 5.4)', () => {
    document.body.innerHTML = `
      <div class="hero__image">visible hero</div>
      <section data-reveal>visible content</section>
    `;

    // Simulate a broken gsap: registration blows up.
    registerPlugin.mockImplementation(() => {
      throw new Error('gsap registration failed');
    });

    expect(() => initMotion()).not.toThrow();

    // Early return: no matchMedia wiring, no tweens scheduled.
    expect(matchMedia).not.toHaveBeenCalled();
    expect(mediaAdd).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(fromTo).not.toHaveBeenCalled();
    expect(timeline).not.toHaveBeenCalled();

    // Content stays in the DOM and is never hidden by the script.
    const hero = document.querySelector('.hero__image') as HTMLElement;
    const reveal = document.querySelector('[data-reveal]') as HTMLElement;
    expect(hero.textContent).toContain('visible hero');
    expect(reveal.textContent).toContain('visible content');
    expect(hero.style.opacity).toBe('');
    expect(reveal.style.display).not.toBe('none');
  });
});

describe('initNav', () => {
  it('is a safe no-op when #menu-toggle and #primary-nav are absent (Validates: Requirements 5.4)', () => {
    document.body.innerHTML = '<main>no nav here</main>';
    expect(() => initNav()).not.toThrow();
  });
});
