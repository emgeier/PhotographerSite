import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// A single gallery photo. Authors may set a bespoke `caption`; when omitted the
// story page falls back to the shared editorial pool (see the `settings`
// collection) rotated by index.
//
// Backward/CMS compatible: a gallery entry may be written either as a bare
// string path ("/images/foo.webp") or as an object ({ image, caption }). Both
// normalize to `{ image, caption? }` so existing string lists keep working and
// the CMS object widget authors new ones.
const galleryItem = z
  .union([
    z.string(),
    z.object({
      image: z.string(),
      caption: z.string().optional(),
    }),
  ])
  .transform((value) =>
    typeof value === 'string' ? { image: value, caption: undefined } : value,
  );

// Astro 7.3.5 Content Layer collection. The glob loader's `entry.id` is the
// filename stem (e.g. "heather"), which is the route slug — nothing reads
// `entry.slug`. See .agents/tasks/activecampaign-aws/design.md §3.2.
const muses = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/muses' }),
  schema: z.object({
    number: z.string(), // "MUSE 001" — exact display string
    order: z.number().int(), // 1..6, drives stories.astro grid + featured ordering
    name: z.string(), // "HEATHER" (uppercase as rendered)
    tagline: z.string(), // "Seeing Herself Differently."
    featured: z.boolean().default(false), // true for the stories.astro featured block (Heather)

    // Media — all optional with current-asset defaults so lightly-seeded muses
    // render identically to today without per-file media.
    cardImage: z.string().default('/images/ms-muse-1.svg'), // stories.astro grid thumb
    heroImage: z.string().default('/images/st-hero.svg'), // [slug] hero
    // Gallery mosaic + lightbox. Each item is `{ image, caption? }` (see
    // galleryItem above): a bare string or a {image,caption} object both work.
    gallery: z.array(galleryItem).default([
      '/images/st-gallery-1.svg', '/images/st-gallery-2.svg', '/images/st-gallery-3.svg',
      '/images/st-gallery-4.svg', '/images/st-gallery-5.svg', '/images/st-gallery-6.svg',
      '/images/st-gallery-7.svg', '/images/st-gallery-8.svg', '/images/st-gallery-9.svg',
      '/images/st-gallery-10.svg',
    ]),
    beforeImage: z.string().default('/images/st-before.svg'),
    afterImage: z.string().default('/images/st-after.svg'),
    motionImage: z.string().default('/images/st-motion.svg'), // short-film still
    // S3 media-bucket URL for the muse film, served through CloudFront:
    // https://<CloudFrontDomainName>/media/<path>.mp4 (never a raw S3 URL — OAC
    // blocks direct reads). Omitted entirely on all seeds (never '').
    videoUrl: z.string().url().optional(),

    // Long-form body copy that is hardcoded in [slug].astro today. heroPara is
    // the SUFFIX only (no {first} token); the template renders `{first} {heroPara}`.
    heroPara: z.string().default('came to this experience at a moment of change — ready to see herself with fresh eyes. What she found was more than beautiful photographs. It was a reminder of who she is: strong, joyful, and unapologetically her. This is her story.'),
    introPara: z.string().default('She wanted to feel like herself again — confident, present, and free. More than beautiful photos, she wanted a new perspective. And what she found was a reminder that the woman she was searching for had been there all along.'),
    transformPara: z.string().default("The transformation isn't about changing who she is. It's about giving her the space to see herself differently."),

    // stories.astro FEATURED block paragraph: a SHORT standalone sentence, with
    // no derived `first`, stored as the FULL literal string. Only the featured
    // entry (Heather) needs it today.
    featuredPara: z.string().optional(),
  }),
});

// Site settings — CMS-editable JSON singletons under src/content/settings.
// Each page has its own entry (e.g. `experience.json`), plus the shared
// `gallery.json` caption pool. ALL fields are optional so one permissive schema
// validates every settings file; each page reads the fields it needs via
// `getEntry('settings', '<name>')` and falls back to its hardcoded defaults
// when the entry or a field is absent. Image fields are `/images/*` strings
// (passthrough <img> through Pic), so the CMS can upload/swap them freely.
const settings = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/settings' }),
  schema: z.object({
    // gallery.json — shared editorial caption pool.
    galleryCaptions: z.array(z.string()).optional(),

    // experience.json — The Experience page images.
    heroImage: z.string().optional(),
    processImages: z.array(z.string()).optional(),
    insideImages: z.array(z.string()).optional(),
    ctaImage: z.string().optional(),

    // contact.json — Contact page images.
    contactHeroImage: z.string().optional(),
    contactAboutImage: z.string().optional(),
    contactStepsImage: z.string().optional(),
    contactCloseImage: z.string().optional(),

    // stories.json — Muse Stories listing page band images + hero.
    lookAgainImage: z.string().optional(),
    motionImage: z.string().optional(),
    storiesCtaImage: z.string().optional(),
    storiesHeroImage: z.string().optional(),

    // home.json — Home page images.
    homeHeroImage: z.string().optional(),
    homePortraitImage: z.string().optional(),
    homeClosingImage: z.string().optional(),
    homeExperienceImage: z.string().optional(),

    // portfolio.json — Portfolio page non-grid images.
    portfolioHeroImage: z.string().optional(),
    portfolioBannerImage: z.string().optional(),
    portfolioFilmImage: z.string().optional(),
    portfolioClosingImage: z.string().optional(),
  }),
});

export const collections = { muses, settings };
