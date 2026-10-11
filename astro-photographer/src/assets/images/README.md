# Fixed_Media: stable source filenames vs. hashed output URLs

This folder holds **Fixed_Media** — the marketing / art-direction rasters used by the
Home and Portfolio pages. These are **not** muse content and are **never** authored
through the CMS. They exist to support a future direct-to-S3 **Replace_By_Filename**
workflow where the photographer swaps a photo by overwriting a file of the same name,
with no CMS round-trip and no code change.

_Satisfies Requirements 11.1, 11.3, 11.4._

## The Fixed_Media set

Reference each of these by its **fixed, unhashed source filename**. Never rename them.

| Slot | Source path |
|------|-------------|
| Home hero | `src/assets/images/hero.webp` |
| Home "Look Again" portrait | `src/assets/images/portrait.webp` |
| Home closing | `src/assets/images/closing.webp` |
| Home story teasers | `src/assets/images/story-*.webp` (`story-perspective`, `story-portrait`, `story-softness`) |
| Portfolio grid portraits | `src/assets/images/portfolio/portrait-01.webp` … `portrait-09.webp` |
| Portfolio manifesto banner | `src/assets/images/portfolio/banner.webp` |

(The `.png` files alongside these are legacy placeholders being phased out and are not
part of the Fixed_Media contract.)

## The tension: hashed output, stable source

`astro:assets` (via `Pic.astro`) **content-hashes the OUTPUT URL** — a build emits
something like `dist/_astro/hero.a1b2c3d4.webp`. The hash changes whenever the file's
bytes change. That is **good** for cache-busting: visitors always get the current image
and never a stale cached copy.

But a content-hashed output URL is **not** a stable address you can overwrite in place.
So the stable contract is **not** the output URL — it is the **SOURCE filename**:

- **SOURCE filename** (e.g. `hero.webp`): stable. This is the contract. Never changes.
- **OUTPUT URL** (e.g. `_astro/hero.a1b2c3d4.webp`): hashed. Regenerated every build.

## How the reconciliation works

A Replace_By_Filename swap stays possible precisely because the swap happens at the
**source**, not the output:

1. The photographer (or the future upload admin) writes the new image to the stable
   source path/filename — e.g. overwrites `hero.webp` with the same name, or writes to
   the agreed S3 location the build consumes. Same filename overwrites the old one.
2. A **rebuild + deploy** runs. `astro:assets` re-processes the new bytes and emits a
   fresh hashed output URL under `dist/_astro/`.
3. The new hash cache-busts automatically; every page that imports that stable source
   filename now points at the new output. No CMS edit, no code change.

The content-hash on the output does **not** break this workflow — it is downstream of
the swap and is regenerated for us on every build.

## The future upload admin

The out-of-scope upload admin writes to the **stable source path/filename** (or to an
S3 location the build consumes), then triggers a rebuild+deploy. It never requires a
CMS edit and never requires a code change to swap a Fixed_Media image. Keeping the
source filenames fixed is what preserves that path.

## Rule for developers

- When referencing Fixed_Media in `.astro`, **import by these stable source filenames**:

  ```astro
  ---
  import hero from '../assets/images/hero.webp';
  import Pic from '../components/Pic.astro';
  ---
  <Pic src={hero} alt="…" priority />
  ```

- **Never rename** a Fixed_Media source file. The filename is the contract the future
  Replace_By_Filename workflow depends on.
- A replacement must **reuse the exact filename** — overwrite in place, do not add a
  suffix or a new name.
- Always route rasters through `Pic` / `astro:assets` (AVIF/WebP + srcset). The hashed
  output URL is expected and correct; it does not change the source-filename contract.
