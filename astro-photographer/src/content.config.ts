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
// The CMS writes empty strings ('') for optional fields the editor leaves
// blank. Treat '' (and whitespace-only) as "unset" so a blank field falls back
// to its default rather than overriding it or failing validation.
// `imageOr(default)` -> an optional string that defaults to `fallback` when
// empty/absent. `optionalUrl` -> a URL that is undefined when empty/absent.
const imageOr = (fallback: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().default(fallback),
  );
const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url().optional(),
);
const optionalText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().optional(),
);
// Optional string list: drop empty/whitespace entries, and treat an
// absent/empty list as "unset" (undefined) so the page's fallback applies.
const optionalList = z.preprocess((v) => {
  if (!Array.isArray(v)) return undefined;
  const cleaned = v.filter((x) => typeof x === 'string' && x.trim() !== '');
  return cleaned.length ? cleaned : undefined;
}, z.array(z.string()).optional());

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
    cardImage: imageOr('/images/ms-muse-1.svg'), // stories.astro grid thumb
    heroImage: imageOr('/images/st-hero.svg'), // [slug] hero
    // Gallery mosaic + lightbox. Each item is `{ image, caption? }` (see
    // galleryItem above): a bare string or a {image,caption} object both work.
    gallery: z.array(galleryItem).default([
      '/images/st-gallery-1.svg', '/images/st-gallery-2.svg', '/images/st-gallery-3.svg',
      '/images/st-gallery-4.svg', '/images/st-gallery-5.svg', '/images/st-gallery-6.svg',
      '/images/st-gallery-7.svg', '/images/st-gallery-8.svg', '/images/st-gallery-9.svg',
      '/images/st-gallery-10.svg',
    ]),
    beforeImage: imageOr('/images/st-before.svg'),
    afterImage: imageOr('/images/st-after.svg'),
    motionImage: imageOr('/images/st-motion.svg'), // short-film still
    // S3 media-bucket URL for the muse film, served through CloudFront:
    // https://<CloudFrontDomainName>/media/<path>.mp4 (never a raw S3 URL — OAC
    // blocks direct reads). Omitted entirely on all seeds (never '').
    videoUrl: optionalUrl,

    // Long-form body copy that is hardcoded in [slug].astro today. heroPara is
    // the SUFFIX only (no {first} token); the template renders `{first} {heroPara}`.
    heroPara: z.string().default('came to this experience at a moment of change — ready to see herself with fresh eyes. What she found was more than beautiful photographs. It was a reminder of who she is: strong, joyful, and unapologetically her. This is her story.'),
    introPara: z.string().default('She wanted to feel like herself again — confident, present, and free. More than beautiful photos, she wanted a new perspective. And what she found was a reminder that the woman she was searching for had been there all along.'),
    transformPara: z.string().default("The transformation isn't about changing who she is. It's about giving her the space to see herself differently."),

    // stories.astro FEATURED block paragraph: a SHORT standalone sentence, with
    // no derived `first`, stored as the FULL literal string. Only the featured
    // entry (Heather) needs it today.
    featuredPara: optionalText,
  }),
});

// Wedding stories — a FOLDER collection (one Markdown file per story) modeled
// on `muses`. The glob loader's `entry.id` is the filename stem, which is the
// route slug for /weddings/stories/<slug>. Replaces the old hardcoded
// src/data/weddingStories.ts module. All image fields default to existing
// /images assets so a lightly-seeded story renders identically to today.
const weddingStories = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/weddingStories' }),
  schema: z.object({
    order: z.number().int(),
    type: z.enum(['Wedding', 'Engagement']).default('Wedding'),
    names: z.string(),
    place: z.string(),
    featured: z.boolean().default(false),
    cardImage: imageOr('/images/portfolio-closing.webp'),
    heroImage: imageOr('/images/home-hero.webp'),
    introTitle: z.string(),
    introParas: z.array(z.string()),
    gallery: z.array(z.string()).default([
      '/images/muses/portrait-01.webp',
      '/images/portfolio-closing.webp',
      '/images/muses/portrait-02.webp',
      '/images/muses/portrait-03.webp',
      '/images/portfolio-banner.webp',
      '/images/muses/portrait-04.webp',
      '/images/portfolio-hero.webp',
      '/images/muses/portrait-05.webp',
      '/images/portfolio-film.webp',
      '/images/muses/portrait-06.webp',
      '/images/muses/portrait-07.webp',
      '/images/muses/portrait-08.webp',
    ]),
    quoteText: z.string(),
    quoteAttribution: z.string(),
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
  // Every field uses the empty-string-tolerant helpers: a field the editor
  // leaves blank in the CMS (saved as '' or an empty list) is treated as unset,
  // so the page's hardcoded fallback applies instead of an empty value.
  schema: z.object({
    // gallery.json — shared editorial caption pool.
    galleryCaptions: optionalList,

    // experience.json — The Experience page images.
    heroImage: optionalText,
    processImages: optionalList,
    insideImages: optionalList,
    ctaImage: optionalText,

    // inquire.json — Inquire page images.
    contactHeroImage: optionalText,
    contactAboutImage: optionalText,
    contactStepsImage: optionalText,
    contactCloseImage: optionalText,

    // stories.json — Muse Stories listing page band images + hero.
    lookAgainImage: optionalText,
    motionImage: optionalText,
    storiesCtaImage: optionalText,
    storiesHeroImage: optionalText,

    // apexhome.json — Apex studio hub (/home) hero carousel slides 2 & 3
    // (slide 1 is apexHeroImage, already declared below).
    apexHeroImage2: optionalText,
    apexHeroImage3: optionalText,

    // home.json — Home page images.
    homeHeroImage: optionalText,
    homePortraitImage: optionalText,
    homeClosingImage: optionalText,
    homeExperienceImage: optionalText,

    // apexhome.json — Apex studio hub (/home) images.
    apexHeroImage: optionalText,
    apexWeddingsCardImage: optionalText,
    apexGlamCardImage: optionalText,
    apexBeautyImage: optionalText,
    apexBeautyInsetImage: optionalText,
    apexMeetImage: optionalText,
    apexCtaImage: optionalText,

    // portfolio.json — Portfolio page non-grid images.
    portfolioHeroImage: optionalText,
    portfolioBannerImage: optionalText,
    portfolioFilmImage: optionalText,
    portfolioClosingImage: optionalText,

    // landing.json — the /landing single-muse feature page.
    museEyebrow: optionalText,
    museName: optionalText,
    museSub: optionalText,
    museLede: optionalText,
    landingHeroImage: optionalText,
    filmPoster: optionalText,
    filmTitle: optionalText,
    filmCopy: optionalText,
    filmVideoUrl: optionalText,
    landingGallery: optionalList,
    deserveTitle: optionalText,
    deservePara1: optionalText,
    deservePara2: optionalText,
    deserveSignature: optionalText,
    deserveImage: optionalText,
    landingCtaTitle: optionalText,
    landingCtaCopy: optionalText,
    landingCtaImage: optionalText,

    // link.json — the /link "link in bio" page.
    linkPortrait: optionalText,
    linkName: optionalText,
    linkGreeting: optionalText,
    linkTagline: optionalText,
    linkLocation: optionalText,
    linkPhone: optionalText,
    linkEmail: optionalText,
    linkCards: z
      .array(
        z.object({
          image: z.string().optional(),
          titleTop: z.string().optional(),
          titleMain: z.string().optional(),
          titleMain2: z.string().optional(),
          titleBottom: z.string().optional(),
          sub: z.string().optional(),
          button: z.string().optional(),
          href: z.string().optional(),
          external: z.boolean().optional(),
          kind: z.string().optional(),
        }),
      )
      .optional(),
    linkFooter: optionalText,

    // weddings-home.json — Weddings home (/weddings) section images.
    wedHomeHeroImage: optionalText,
    wedHomePhiloImage: optionalText,
    wedHomeWeddingsCardImage: optionalText,
    wedHomeEngagementsCardImage: optionalText,
    wedHomeAboutImage: optionalText,
    wedHomeCtaImage: optionalText,

    // weddings-experience.json — The Experience (/weddings/experience) images.
    wedExperienceHeroImage: optionalText,
    wedExperienceEasePhoto: optionalText,
    wedExperienceCtaImage: optionalText,

    // weddings-portfolio.json — Wedding Portfolio (/weddings/portfolio) images.
    wedPortfolioHeroImage: optionalText,
    wedPortfolioVideoImage: optionalText,
    wedPortfolioCtaImage: optionalText,

    // weddings-faq.json — Weddings FAQ (/weddings/faq) images.
    wedFaqHeroImage: optionalText,
    wedFaqCtaImage: optionalText,

    // weddings-engagements.json — Engagement Portfolio (/weddings/engagements) images.
    wedEngagementsHeroImage: optionalText,
    wedEngagementsVideoImage: optionalText,
    wedEngagementsCtaImage: optionalText,

    // weddings-inquire.json — Inquire (/weddings/inquire) images.
    wedInquireHeroImage: optionalText,
    wedInquireFormImage: optionalText,
    wedInquireNoteImage: optionalText,
    wedInquireCtaImage: optionalText,

    // weddings-testimonials.json — Testimonials (/weddings/testimonials) images.
    wedTestimonialsHeroImage: optionalText,
    wedTestimonialsFeaturedPhoto: optionalText,
    wedTestimonialsVideoImage: optionalText,
    wedTestimonialsCtaImage: optionalText,

    // weddings-about.json — About Luis (/weddings/about) images.
    wedAboutHeroImage: optionalText,
    wedAboutLifeImage: optionalText,
    wedAboutPhiloImage: optionalText,
    wedAboutVideoImage: optionalText,
    wedAboutCtaImage: optionalText,

    // weddings-stories.json — Love Stories listing + story detail (/weddings/stories[/<slug>]) images.
    wedStoriesHeroImage: optionalText,
    wedStoriesCtaImage: optionalText,
    wedStoryDetailCtaImage: optionalText,
  }),
});

export const collections = { muses, settings, weddingStories };
