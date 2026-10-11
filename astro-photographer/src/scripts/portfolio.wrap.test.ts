import { describe, expect, it } from 'vitest';
import { fc, test } from '@fast-check/vitest';

import { wrapIndex } from './portfolio';

/**
 * Property test for the `renderGallery` index-wrap math (design Property 6).
 *
 * `renderGallery` normalizes any requested index into `[0, len)` via the pure
 * helper `wrapIndex(i, len) = ((i % len) + len) % len`, so stepping past either
 * end of the gallery wraps around instead of going out of range
 * (**Validates: Requirements 6.4**). The helper is exported from `portfolio.ts`
 * expressly so this math can be exercised in isolation, with no DOM.
 *
 * Generators are constrained to the real input space: `i` is any safe integer
 * (including large negatives and positives, the hard cases for the `%` fix-up),
 * and `len` is an integer `>= 1` (a gallery always has at least one entry — the
 * zero-card case is guarded earlier in `initLightbox`).
 */
describe('wrapIndex (Property 6 — lightbox index bounded)', () => {
  const anyIndex = fc.integer();
  const anyLength = fc.integer({ min: 1, max: 100_000 });

  test.prop([anyIndex, anyLength])(
    'result is always within [0, len) for every integer index (Validates: Requirements 6.4)',
    (i, len) => {
      const wrapped = wrapIndex(i, len);
      expect(Number.isInteger(wrapped)).toBe(true);
      expect(wrapped).toBeGreaterThanOrEqual(0);
      expect(wrapped).toBeLessThan(len);
    },
  );

  test.prop([anyIndex, anyLength])(
    'stepping forward is consistent with modular increment (Validates: Requirements 6.4)',
    (i, len) => {
      // Advancing one position wraps exactly like `(current + 1) % len`, so the
      // next/arrow-key navigation never skips or escapes the valid range.
      expect(wrapIndex(i + 1, len)).toBe((wrapIndex(i, len) + 1) % len);
    },
  );

  test.prop([anyIndex, anyLength])(
    'stepping backward wraps symmetrically to the forward step (Validates: Requirements 6.4)',
    (i, len) => {
      // Prev-arrow / right-swipe steps backward and must stay in range,
      // mirroring the forward step: dec then +len keeps it non-negative.
      expect(wrapIndex(i - 1, len)).toBe((wrapIndex(i, len) + len - 1) % len);
    },
  );

  // A couple of concrete anchors make the intended behavior obvious at a glance
  // and pin the boundary/negative cases the property covers probabilistically.
  it('wraps the documented boundary and negative cases', () => {
    expect(wrapIndex(0, 9)).toBe(0);
    expect(wrapIndex(8, 9)).toBe(8);
    expect(wrapIndex(9, 9)).toBe(0); // past the end wraps to the start
    expect(wrapIndex(-1, 9)).toBe(8); // before the start wraps to the end
    expect(wrapIndex(-9, 9)).toBe(0);
    expect(wrapIndex(-10, 9)).toBe(8);
    expect(wrapIndex(5, 1)).toBe(0); // single-entry gallery is always index 0
  });
});
