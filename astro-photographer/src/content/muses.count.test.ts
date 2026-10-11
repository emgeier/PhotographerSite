import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Platform preservation guard for the EXISTING muses content collection.
// Property 1 / Validates: Requirements 14.2 — the Muses_Collection must keep
// returning its existing six entries. Rather than boot Astro's content runtime
// inside vitest (flaky / needs the full astro:content virtual module), we assert
// the hermetic invariant that backs the collection: exactly six markdown entries
// live in src/content/muses. vitest runs from the project root, so resolve the
// collection directory relative to cwd.
const musesDir = resolve(process.cwd(), 'src/content/muses');

describe('muses content collection (Property 1 / Validates: Requirements 14.2)', () => {
  it('still contains exactly SIX muse markdown entries', () => {
    const markdownFiles = readdirSync(musesDir).filter((name) => name.endsWith('.md'));

    expect(markdownFiles.slice().sort()).toEqual([
      'elise.md',
      'heather.md',
      'jasmine.md',
      'kaylee.md',
      'lauren.md',
      'renee.md',
    ]);
    expect(markdownFiles.length).toBe(6);
  });
});
