// Love Story forms: merge CMS-edited chapters over the built-in defaults.
//
// The CMS (settings/engagement-love-story.json, settings/wedding-love-story.json)
// stores chapters as { label, title, image, alt, questions: [{ text }] }. Blank
// values fall back to the defaults the page passes in, and an empty/absent list
// uses the defaults entirely, so the form never renders empty.

/** Hard cap on questions per form. Keep in sync with MAX_QUESTIONS in
 *  aws/lambda/lovestory/index.mjs (the Lambda ignores answers past it). */
export const MAX_QUESTIONS = 20;

export interface Chapter {
  label: string;
  title: string;
  image: string;
  alt: string;
  questions: { text: string; tall?: boolean }[];
}

interface CmsChapter {
  label?: string;
  title?: string;
  image?: string;
  alt?: string;
  questions?: { text?: string }[];
}

const filled = (s: string | undefined): s is string => typeof s === 'string' && s.trim() !== '';

export function resolveChapters(cms: CmsChapter[] | undefined, defaults: Chapter[]): Chapter[] {
  if (!cms?.length) return defaults;
  const out: Chapter[] = [];
  let used = 0;
  cms.forEach((c, i) => {
    const fallback = defaults[i] ?? defaults[defaults.length - 1];
    const texts = (c.questions ?? []).map((q) => q.text).filter(filled).map((t) => t.trim());
    const questions = texts.slice(0, Math.max(0, MAX_QUESTIONS - used)).map((text) => ({ text }));
    if (!questions.length) return; // a chapter with no questions is dropped
    used += questions.length;
    out.push({
      label: filled(c.label) ? c.label.trim() : `Chapter ${i + 1}`,
      title: filled(c.title) ? c.title.trim() : fallback.title,
      image: filled(c.image) ? c.image : fallback.image,
      alt: filled(c.alt) ? c.alt.trim() : filled(c.image) ? '' : fallback.alt,
      questions,
    });
  });
  return out.length ? out : defaults;
}
