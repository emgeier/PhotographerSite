import { describe, it, expect } from 'vitest';
import type { ImageMetadata } from 'astro';
import { resolveWith } from './cmsImage';

// Minimal ImageMetadata stand-ins. The resolver only cares about object
// identity / the `.src` the caller reads later, so a shaped literal is enough.
const meta = (src: string): ImageMetadata =>
  ({ src, width: 100, height: 100, format: 'webp' } as ImageMetadata);

const upload = meta('/_astro/insta12.hash.webp');
const musePortrait = meta('/_astro/portrait-01.hash.webp');
const curated = meta('/_astro/curated-hero.hash.webp');

// byPath holds every /src/assets/** key; byBasename is scoped to uploads only.
const pathMap = new Map<string, ImageMetadata>([
  ['/src/assets/images/uploads/Insta12.jpg', upload],
  ['/src/assets/images/uploads/muses/portrait-01.webp', musePortrait],
  ['/src/assets/images/hero.webp', curated], // curated, NOT in byBasename
]);
const baseMap = new Map<string, ImageMetadata>([
  ['Insta12.jpg', upload],
  ['portrait-01.webp', musePortrait],
]);

describe('resolveWith', () => {
  it('(a) returns metadata for an exact asset path key', () => {
    expect(resolveWith(pathMap, baseMap, '/src/assets/images/uploads/Insta12.jpg')).toBe(upload);
  });

  it('(b) returns metadata for an asset path missing its leading slash', () => {
    expect(resolveWith(pathMap, baseMap, 'src/assets/images/uploads/Insta12.jpg')).toBe(upload);
  });

  it('(c) bridges /images/<basename> to the uploads asset by basename', () => {
    expect(resolveWith(pathMap, baseMap, '/images/Insta12.jpg')).toBe(upload);
  });

  it('(d) bridges /images/muses/<basename> on basename too', () => {
    expect(resolveWith(pathMap, baseMap, '/images/muses/portrait-01.webp')).toBe(musePortrait);
  });

  it('(e) returns the original string for a legacy /images value with no asset', () => {
    expect(resolveWith(pathMap, baseMap, '/images/st-hero.svg')).toBe('/images/st-hero.svg');
    expect(resolveWith(pathMap, baseMap, '/images/not-migrated.webp')).toBe('/images/not-migrated.webp');
  });

  it('(f) returns the original string for a non-/images value (external URL)', () => {
    expect(resolveWith(pathMap, baseMap, 'https://cdn.example.com/a.jpg')).toBe(
      'https://cdn.example.com/a.jpg',
    );
  });

  it('(g) returns "" for falsy values', () => {
    expect(resolveWith(pathMap, baseMap, '')).toBe('');
    expect(resolveWith(pathMap, baseMap, undefined)).toBe('');
    expect(resolveWith(pathMap, baseMap, null)).toBe('');
  });

  it('(h) returns an ImageMetadata object unchanged', () => {
    expect(resolveWith(pathMap, baseMap, upload)).toBe(upload);
  });

  it('does not let a curated basename shadow — only uploads are in byBasename', () => {
    // 'hero.webp' exists in byPath (curated) but NOT in byBasename, so a bare
    // /images/hero.webp reference does not resolve to the curated asset.
    expect(resolveWith(pathMap, baseMap, '/images/hero.webp')).toBe('/images/hero.webp');
  });
});
