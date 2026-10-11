/**
 * @vitest-environment jsdom
 *
 * Unit tests for the privacy-preserving experience-film lifecycle in
 * `portfolio.ts` (task 6.4): `buildExperienceVideoSrc` (pure) and
 * `initExperienceVideo` (DOM wiring).
 *
 * The `@vitest-environment jsdom` docblock above opts THIS file into jsdom
 * without touching any shared vitest config (task 5.2 owns the project-wide
 * setup). Keeping the environment per-file means these tests run correctly
 * whether or not a global jsdom default is configured.
 *
 * Coverage:
 *  - Requirement 7.3 — autoplay reflects reduced motion (via the pure helper).
 *  - Requirement 7.1 — no YouTube request on load; the iframe src stays
 *    `about:blank` until a `[data-open-experience]` trigger is activated.
 *  - Requirement 7.4 — on the dialog `close` event the iframe src resets to
 *    `about:blank` to stop playback.
 *  - Safe no-op when `#experience-dialog` is absent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EXPERIENCE_VIDEO_ID,
  buildExperienceVideoSrc,
  initExperienceVideo,
} from './portfolio';

/**
 * Install a `window.matchMedia` stub that reports the given reduced-motion
 * preference for `(prefers-reduced-motion: reduce)`. jsdom does not implement
 * matchMedia, so every test that reaches the reduced-motion branch needs this.
 */
function stubMatchMedia(prefersReducedMotion: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce')
      ? prefersReducedMotion
      : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/**
 * jsdom does not implement `HTMLDialogElement.showModal`/`close`/`open`, so we
 * provide lightweight stand-ins that flip an `open` attribute and (for `close`)
 * dispatch the native `close` event the lifecycle listens for.
 */
function patchDialog(dialog: HTMLDialogElement): void {
  Object.defineProperty(dialog, 'open', {
    configurable: true,
    get() {
      return this.hasAttribute('open');
    },
    set(value: boolean) {
      if (value) this.setAttribute('open', '');
      else this.removeAttribute('open');
    },
  });
  dialog.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  dialog.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
}

/**
 * Build the portfolio experience markup: a `#experience-dialog` holding the
 * `#experience-video` iframe (src starts at `about:blank`), a trigger, and a
 * close control. Returns the key nodes for assertions.
 */
function mountExperienceDom(): {
  dialog: HTMLDialogElement;
  iframe: HTMLIFrameElement;
  trigger: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
} {
  document.body.innerHTML = `
    <button type="button" data-open-experience>Watch the film</button>
    <dialog id="experience-dialog">
      <form method="dialog">
        <button type="submit" data-close-experience>Close</button>
      </form>
      <iframe
        id="experience-video"
        src="about:blank"
        title="The studio experience film"
        allow="autoplay; encrypted-media; picture-in-picture"
      ></iframe>
    </dialog>
  `;
  const dialog = document.querySelector<HTMLDialogElement>(
    '#experience-dialog',
  )!;
  const iframe = document.querySelector<HTMLIFrameElement>(
    '#experience-video',
  )!;
  const trigger = document.querySelector<HTMLButtonElement>(
    '[data-open-experience]',
  )!;
  const closeBtn = document.querySelector<HTMLButtonElement>(
    '[data-close-experience]',
  )!;
  patchDialog(dialog);
  return { dialog, iframe, trigger, closeBtn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('buildExperienceVideoSrc (Validates: Requirement 7.3)', () => {
  it('returns a youtube-nocookie embed URL with autoplay=1 when reduced motion is off', () => {
    const url = new URL(buildExperienceVideoSrc(false));

    expect(url.host).toBe('www.youtube-nocookie.com');
    expect(url.pathname).toBe(`/embed/${EXPERIENCE_VIDEO_ID}`);
    expect(EXPERIENCE_VIDEO_ID).toBe('yr74CtwKoEk');

    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
    expect(url.searchParams.get('playsinline')).toBe('1');
    expect(url.searchParams.get('modestbranding')).toBe('1');
  });

  it('returns autoplay=0 when reduced motion is requested', () => {
    const url = new URL(buildExperienceVideoSrc(true));

    expect(url.host).toBe('www.youtube-nocookie.com');
    expect(url.pathname).toBe(`/embed/${EXPERIENCE_VIDEO_ID}`);
    expect(url.searchParams.get('autoplay')).toBe('0');
    // Privacy/UX params are present regardless of the motion preference.
    expect(url.searchParams.get('rel')).toBe('0');
    expect(url.searchParams.get('playsinline')).toBe('1');
    expect(url.searchParams.get('modestbranding')).toBe('1');
  });
});

describe('initExperienceVideo (Validates: Requirements 7.1, 7.4)', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('issues no YouTube request on load: iframe src stays about:blank before any trigger click (Validates: Requirement 7.1)', () => {
    const { iframe } = mountExperienceDom();

    initExperienceVideo();

    // Wiring alone must not touch the iframe src — nothing loads from YouTube
    // until the visitor opts in by activating the trigger.
    expect(iframe.getAttribute('src')).toBe('about:blank');
    expect(iframe.src).not.toContain('youtube');
    expect(iframe.src).not.toContain('youtube-nocookie');
  });

  it('loads the youtube-nocookie embed only after the trigger is activated (Validates: Requirement 7.1)', () => {
    const { iframe, trigger } = mountExperienceDom();

    initExperienceVideo();
    expect(iframe.src).not.toContain('youtube-nocookie');

    trigger.click();

    const url = new URL(iframe.src);
    expect(url.host).toBe('www.youtube-nocookie.com');
    expect(url.pathname).toBe(`/embed/${EXPERIENCE_VIDEO_ID}`);
    // Reduced motion is off in this suite, so autoplay should be on.
    expect(url.searchParams.get('autoplay')).toBe('1');
  });

  it('resets the iframe src to about:blank when the dialog closes (Validates: Requirement 7.4)', () => {
    const { dialog, iframe, trigger } = mountExperienceDom();

    initExperienceVideo();
    trigger.click();
    expect(iframe.src).toContain('youtube-nocookie');

    // Closing via the native dialog `close` event must stop playback.
    dialog.dispatchEvent(new Event('close'));

    expect(iframe.getAttribute('src')).toBe('about:blank');
    expect(iframe.src).not.toContain('youtube');
  });

  it('builds the embed with autoplay=0 when reduced motion is requested at click time (Validates: Requirement 7.3)', () => {
    stubMatchMedia(true);
    const { iframe, trigger } = mountExperienceDom();

    initExperienceVideo();
    trigger.click();

    const url = new URL(iframe.src);
    expect(url.host).toBe('www.youtube-nocookie.com');
    expect(url.searchParams.get('autoplay')).toBe('0');
  });

  it('is a safe no-op when #experience-dialog is absent (does not throw)', () => {
    document.body.innerHTML =
      '<button type="button" data-open-experience>Watch</button>';

    expect(() => initExperienceVideo()).not.toThrow();
  });
});
