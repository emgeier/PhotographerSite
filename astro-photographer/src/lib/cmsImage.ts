// CMS image resolver — bridges a CMS-stored image path to a build-time asset.
//
// Route CMS-managed images through Astro's build-time image pipeline
// (astro:assets / <Pic> -> <Picture>) so uploaded photos get AVIF/WebP +
// responsive srcset, while GUARANTEEING no image ever 404s.
//
// The ONE governing rule: a value resolved to ImageMetadata here may be
// rendered ONLY through <Pic> (which branches on object vs string). A value
// rendered by a raw <img> element (script-mutated, or a lightbox stage image)
// MUST stay a plain string and MUST NOT be wrapped — wrapping stringifies the
// ImageMetadata object to "[object Object]" and breaks the image.
//
// How it works: Decap keeps public_folder: /images, so stored values keep the
// familiar /images/<basename> shape. CMS uploads now commit under
// src/assets/images/uploads/, which Astro's image pipeline can see. This module
// builds one eager glob map over src/assets/** at build time and bridges a
// stored /images/<basename> to its moved asset by basename. Anything that does
// not resolve (legacy path, external URL, SVG, missing file) returns unchanged
// as a string so Pic renders a safe passthrough <img>.

import type { ImageMetadata } from 'astro';

// Eager glob over every raster asset under src/assets. Astro resolves each
// match to its processed ImageMetadata at build time. Keys are module paths
// rooted at the project root with a leading slash, e.g.
// '/src/assets/images/uploads/foo.webp'.
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true },
);

// Two lookup tables, both built once at module scope:
//  - byPath:     the full '/src/assets/...'-rooted key -> metadata.
//  - byBasename: the file's basename -> metadata, for the uploads folder ONLY,
//                so a stored '/images/<basename>' value can bridge to its moved
//                asset. Scoped to '/src/assets/images/uploads/' so a basename
//                collision with a curated asset elsewhere cannot shadow an
//                upload. The slug-safe rename rule guarantees unique upload
//                basenames; if two ever collided, the LAST wins.
const UPLOADS_PREFIX = '/src/assets/images/uploads/';

const byPath = new Map<string, ImageMetadata>();
const byBasename = new Map<string, ImageMetadata>();
for (const [key, mod] of Object.entries(modules)) {
  byPath.set(key, mod.default);
  if (key.startsWith(UPLOADS_PREFIX)) {
    byBasename.set(key.slice(UPLOADS_PREFIX.length), mod.default);
  }
}

/**
 * Internal, pure, test-seam: resolve against explicitly supplied maps so the
 * resolution logic is unit-testable without the module-scope glob side effects.
 */
export function resolveWith(
  pathMap: Map<string, ImageMetadata>,
  baseMap: Map<string, ImageMetadata>,
  value: string | ImageMetadata | undefined | null,
): ImageMetadata | string {
  if (!value) return '';
  if (typeof value === 'object') return value; // already metadata

  // 1) Exact asset path (a rewritten literal in the asset form), with or
  //    without a leading slash: '/src/assets/images/uploads/foo.webp'.
  const asKey = value.startsWith('/') ? value : `/${value}`;
  const direct = pathMap.get(asKey);
  if (direct) return direct;

  // 2) The CMS reference form: '/images/<basename>' (public_folder stays
  //    /images). Bridge by basename to the moved asset under uploads/. This
  //    also covers a legacy '/images/muses/<basename>' because we key on the
  //    basename only.
  if (value.startsWith('/images/')) {
    const basename = value.slice(value.lastIndexOf('/') + 1);
    const hit = baseMap.get(basename);
    if (hit) return hit;
  }

  // 3) Anything unresolved (legacy /images/* with no moved asset, an https://
  //    URL, an SVG, a stray path) -> return as-is so Pic renders passthrough
  //    <img>. Nothing can 404 that did not 404 before.
  return value;
}

/**
 * Resolve a CMS-stored image value to ImageMetadata when it names a migrated
 * build asset, else return the original string unchanged (passthrough <img>).
 */
export function resolveImage(
  value: string | ImageMetadata | undefined | null,
): ImageMetadata | string {
  return resolveWith(byPath, byBasename, value);
}

/**
 * Resolve each item of a gallery array through resolveImage. Convenience for
 * pages that map a CMS gallery list; callers that need alt text should map
 * explicitly. Falsy / non-array input yields an empty array.
 */
export function resolveImageList(
  values: Array<string | ImageMetadata | undefined | null> | undefined | null,
): Array<ImageMetadata | string> {
  if (!Array.isArray(values)) return [];
  return values.map((v) => resolveImage(v));
}
