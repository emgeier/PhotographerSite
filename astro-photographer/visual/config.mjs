// Central config for the visual comparison harness.
// Each "page" maps a route in the Astro site to the mockup PNG(s) it should match.
//
// NOTE on widths: the exported PNGs are scaled-down previews (e.g. Home Page.png
// is 823px wide), not true device pixels. We render the site at the *design*
// width for each breakpoint and let the HTML report scale both images to a shared
// column width, so the comparison is about proportion/layout, not raw pixels.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(__dirname, '..');
export const websiteRoot = resolve(projectRoot, '..', 'Website');
export const outDir = resolve(__dirname, 'out');

export const baseUrl = process.env.PREVIEW_URL || 'http://localhost:4321';

// Design widths we render at for each breakpoint.
export const breakpoints = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};

export const pages = [
  {
    name: 'home',
    route: '/',
    mockups: {
      desktop: 'Website/01 Home Page/Home Page.png',
      tablet: 'Website/01 Home Page/Tablet.png',
      mobile: 'Website/01 Home Page/Mobile Version.png',
    },
  },
  {
    name: 'portfolio',
    route: '/portfolio',
    mockups: {
      desktop: 'Website/02 Portfolio/2d03c979-f10a-4f0c-b5a9-7a1ffa9d3276.png',
    },
  },
  {
    name: 'experience',
    route: '/experience',
    mockups: {
      desktop: 'Website/03 The Experience/Desktop.png',
      tablet: 'Website/03 The Experience/Ipad.png',
      mobile: 'Website/03 The Experience/Mobile 1.png',
    },
  },
  {
    name: 'stories',
    route: '/stories',
    mockups: {
      desktop: 'Website/04 The Muse Stories/Muse Stories.png',
    },
  },
  {
    name: 'story',
    route: '/stories/heather',
    mockups: {
      desktop: 'Website/04.1 Story - Blog individual/a3ea7239-b02c-4765-8ac1-8ae2c4e64602.png',
    },
  },
  {
    name: 'contact',
    route: '/contact',
    mockups: {
      desktop: 'Website/05 Contact/Contact.png',
    },
  },
];

// Elements whose computed styles we audit, keyed by page name -> list of
// { human label -> CSS selector }. These are the font/margin-sensitive pieces.
export const auditTargetsByPage = {
  home: [
    { label: 'Hero title', selector: '.hero-title' },
    { label: 'Hero eyebrow', selector: '.hero .eyebrow' },
    { label: '"Look Again." heading', selector: '.intro h1' },
    { label: 'Experience heading', selector: '.experience-head h2' },
    { label: 'Experience step number', selector: '.steps b' },
    { label: 'Experience step title', selector: '.steps h3' },
    { label: 'Muse Stories heading', selector: '.stories h2' },
    { label: 'Final CTA heading', selector: '.final-cta h2' },
    { label: 'Content wrapper', selector: '.wrap' },
  ],
  portfolio: [
    { label: 'Hero title "YOU, IN FULL."', selector: '.pf-hero-title' },
    { label: 'Hero eyebrow', selector: '.pf-hero .eyebrow' },
    { label: 'Band heading', selector: '.pf-band-copy h2' },
    { label: 'Experience heading', selector: '.pf-experience-copy h2' },
    { label: 'Process heading', selector: '.pf-process-head' },
    { label: 'Process step number', selector: '.pf-steps b' },
    { label: 'Process step title', selector: '.pf-steps h3' },
    { label: 'Final CTA heading', selector: '.pf-cta-copy h2' },
    { label: 'Content wrapper', selector: '.wrap' },
  ],
  experience: [
    { label: 'Hero eyebrow', selector: '.ex-hero .eyebrow' },
    { label: 'Hero title', selector: '.ex-hero-title' },
    { label: 'Hero lede', selector: '.ex-hero-lede' },
    { label: 'Process heading', selector: '.ex-process-head' },
    { label: 'Process step number', selector: '.ex-steps b' },
    { label: 'Process step title', selector: '.ex-steps h3' },
    { label: 'Inside heading', selector: '.ex-inside-head' },
    { label: 'Final CTA heading', selector: '.ex-cta-head' },
    { label: 'Content wrapper', selector: '.wrap' },
  ],
  stories: [
    { label: 'Hero eyebrow', selector: '.ms-hero-eyebrow' },
    { label: 'Hero title', selector: '.ms-hero-title' },
    { label: 'Featured muse name', selector: '.ms-featured-name' },
    { label: '"Meet the Muses" heading', selector: '.ms-meet-title' },
    { label: 'Muse card name', selector: '.ms-card-name' },
    { label: '"Look Again." heading', selector: '.ms-look-title' },
    { label: '"In Motion." heading', selector: '.ms-motion-title' },
    { label: 'Final CTA heading', selector: '.ms-cta-title' },
    { label: 'Content wrapper', selector: '.wrap' },
  ],
  story: [
    { label: 'Hero name heading', selector: '.st-hero-name' },
    { label: 'Hero eyebrow', selector: '.st-hero-eyebrow' },
    { label: 'Hero tagline', selector: '.st-hero-tag' },
    { label: '"Before the Camera" heading', selector: '.st-intro-title' },
    { label: '"She Was Always There." heading', selector: '.st-transform-title' },
    { label: '"In Motion." heading', selector: '.st-motion-title' },
    { label: '"You\'ve Seen Her Story." heading', selector: '.st-seen-title' },
    { label: 'Final CTA heading', selector: '.st-cta-title' },
    { label: 'Content wrapper', selector: '.wrap' },
  ],
  contact: [
    { label: 'Hero title', selector: '.ct-hero-title' },
    { label: 'Hero eyebrow', selector: '.ct-hero .eyebrow' },
    { label: '"Tell Me About You" heading', selector: '.ct-about-title' },
    { label: 'Form field label', selector: '.ct-form label' },
    { label: '"A Simple Beginning" heading', selector: '.ct-steps-title' },
    { label: 'Step numeral', selector: '.ct-steps b' },
    { label: 'Step title', selector: '.ct-steps h3' },
    { label: '"You, In Full." heading', selector: '.ct-close-title' },
    { label: 'Content wrapper', selector: '.wrap' },
  ],
};

// Backwards-compatible default (home) for any older import.
export const auditTargets = auditTargetsByPage.home;
