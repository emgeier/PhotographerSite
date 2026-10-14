// Shared wedding-stories data — the single source of truth for the weddings
// home 3-up, the Love Stories journal grid, and the dynamic
// /weddings/stories/<slug> detail route. Mirrors how the other wedding pages
// hardcode their arrays (not an Astro content collection; the `muses`
// collection is unrelated to the weddings site). All imagery reuses the
// existing /images pool — no new binary assets.

export type StoryType = 'Wedding' | 'Engagement';

export interface WeddingStory {
  slug: string;
  type: StoryType;
  names: string;
  place: string;
  cardImage: string;
  heroImage: string;
  intro: { title: string; paras: string[] };
  gallery: string[];
  quote: { text: string; attribution: string };
  featured?: boolean;
}

// Image pool (reused with repetition across stories).
const P = (n: number) => `/images/muses/portrait-0${n}.webp`;
const BANNER = '/images/portfolio-banner.webp';
const CLOSING = '/images/portfolio-closing.webp';
const FILM = '/images/portfolio-film.webp';
const HERO = '/images/portfolio-hero.webp';
const STORYP = '/images/story-portrait.webp';
// Bright, light-filled frame used for the full-bleed story hero so the
// overlaid names/eyebrow stay legible under the dark left veil (the dark
// pool images rendered near-black behind light hero text).
const BRIGHT = '/images/home-hero.webp';

const galleryPool = [P(1), CLOSING, P(2), P(3), BANNER, P(4), HERO, P(5), FILM, P(6), P(7), P(8)];

export const weddingStories: WeddingStory[] = [
  {
    slug: 'alex-and-taylor',
    type: 'Wedding',
    names: 'Alex & Taylor',
    place: 'Lake Como, Italy',
    cardImage: CLOSING,
    heroImage: BRIGHT,
    featured: true,
    intro: {
      title: 'A celebration of family, beauty, and a love that feels like home.',
      paras: [
        'Alex and Taylor traveled from across the world to celebrate their wedding on the breathtaking shores of Lake Como. Surrounded by their closest family and friends, their day was filled with genuine emotion, timeless details, and a beauty that could only exist here.',
        'From the quiet moments getting ready to the golden light over the lake, every part of their wedding felt intentional — a true reflection of who they are and the life they are building together.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'It was more beautiful than we ever imagined.',
      attribution: 'Alex & Taylor',
    },
  },
  {
    slug: 'olivia-and-james',
    type: 'Wedding',
    names: 'Olivia & James',
    place: 'Lake Como, Italy',
    cardImage: P(4),
    heroImage: BRIGHT,
    intro: {
      title: 'A celebration of family, beauty, and a love that feels like home.',
      paras: [
        'Olivia and James traveled from across the world to celebrate their wedding on the breathtaking shores of Lake Como. Surrounded by their closest family and friends, their day was filled with genuine emotion, timeless details, and a beauty that could only exist here.',
        'From the quiet moments getting ready to the golden light over the lake, every part of their wedding felt intentional — a true reflection of who they are and the life they are building together.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'It was more beautiful than we ever imagined.',
      attribution: 'Olivia & James',
    },
  },
  {
    slug: 'sophia-and-daniel',
    type: 'Engagement',
    names: 'Sophia & Daniel',
    place: 'Nashville, Tennessee',
    cardImage: P(5),
    heroImage: BRIGHT,
    intro: {
      title: 'A quiet beginning, full of promise and light.',
      paras: [
        'Sophia and Daniel wanted their engagement session to feel like a normal evening together — unhurried, playful, and completely their own. We wandered the city as the light softened, letting the moments unfold naturally.',
        'What we captured was simply them: the easy laughter, the quiet glances, and the excitement of the chapter about to begin.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'It felt effortless, natural, and completely us.',
      attribution: 'Sophia & Daniel',
    },
  },
  {
    slug: 'isabelle-and-marcus',
    type: 'Wedding',
    names: 'Isabelle & Marcus',
    place: 'Amalfi Coast, Italy',
    cardImage: P(6),
    heroImage: BRIGHT,
    intro: {
      title: 'A coastal celebration of love, light, and family.',
      paras: [
        'Isabelle and Marcus gathered the people they love most along the Amalfi Coast, where the sea and sky set the stage for a day that felt entirely timeless.',
        'Every detail reflected their warmth and their deep connection — a celebration as beautiful as it was heartfelt.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'Looking through our photos brings us right back to how it felt.',
      attribution: 'Isabelle & Marcus',
    },
  },
  {
    slug: 'emma-and-noah',
    type: 'Engagement',
    names: 'Emma & Noah',
    place: 'Franklin, Tennessee',
    cardImage: P(7),
    heroImage: BRIGHT,
    intro: {
      title: 'An afternoon that felt like home.',
      paras: [
        'Emma and Noah chose the places that mean the most to them for their engagement session, and that familiarity gave the whole afternoon a gentle, grounded feeling.',
        'The result is a story of two people entirely comfortable with one another, looking forward to everything ahead.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'He has a gift for capturing real moments.',
      attribution: 'Emma & Noah',
    },
  },
  {
    slug: 'charlotte-and-benjamin',
    type: 'Wedding',
    names: 'Charlotte & Benjamin',
    place: 'Tuscany, Italy',
    cardImage: P(8),
    heroImage: BRIGHT,
    intro: {
      title: 'A sun-drenched day among the Tuscan hills.',
      paras: [
        'Charlotte and Benjamin celebrated beneath the golden light of Tuscany, surrounded by rolling hills, long tables, and the people who have shaped their story.',
        'Theirs was a day of joy and ease — a true reflection of a love that feels both grand and wonderfully genuine.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'Every detail, every emotion, every moment was captured beautifully.',
      attribution: 'Charlotte & Benjamin',
    },
  },
  {
    slug: 'madison-and-christopher',
    type: 'Wedding',
    names: 'Madison & Christopher',
    place: 'Nashville, Tennessee',
    cardImage: P(9),
    heroImage: BRIGHT,
    intro: {
      title: 'A celebration rooted in family and joy.',
      paras: [
        'Madison and Christopher brought their families together for a celebration full of warmth, music, and heartfelt moments that spilled late into the night.',
        'It was a day defined by connection — exactly the kind of story we love to tell.',
      ],
    },
    gallery: galleryPool,
    quote: {
      text: 'We will treasure these photographs forever.',
      attribution: 'Madison & Christopher',
    },
  },
];

export const getStory = (slug: string): WeddingStory | undefined =>
  weddingStories.find((s) => s.slug === slug);

export const otherStories = (slug: string, count = 3): WeddingStory[] =>
  weddingStories.filter((s) => s.slug !== slug).slice(0, count);
