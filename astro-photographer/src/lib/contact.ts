// Shared contact + campaign config (modular).
//
// One place to define the studio email and the ActiveCampaign "campaigns".
// Forms import from here so adding a future campaign is a single entry below
// (and a matching env var + resolveListId map key in the AC Lambda).
//
// How a campaign flows end to end:
//   1. A form sets a hidden `list` field to the campaign's `listKey`.
//   2. The AC Lambda's resolveListId() allowlists that key to an env list id
//      (e.g. listKey "giveaway" -> AC_LIST_ID_GIVEAWAY). Unknown/absent keys
//      fall back to the default AC_LIST_ID. See aws/lambda/activecampaign/index.mjs.
//
// To add a campaign later: add an entry here, add AC_LIST_ID_<NAME> to the
// Lambda env (CloudFormation param), and add the map key in resolveListId().

/** Studio contact email (used for the mailto fallback on every contact form). */
export const STUDIO_EMAIL = 'hello@luisquintanastudio.com';

/** A `mailto:` href for the studio email, with optional subject. */
export const mailtoHref = (subject?: string): string =>
  subject ? `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${STUDIO_EMAIL}`;

/** An ActiveCampaign campaign: a symbolic list key + a human label. */
export interface Campaign {
  /** Sent as the form's hidden `list` field; allowlisted server-side. */
  listKey: string;
  /** Human label for docs/menus. */
  label: string;
}

/**
 * Registry of ActiveCampaign campaigns. The `default` entry omits a listKey so
 * the Lambda uses AC_LIST_ID. Add new campaigns here (modular by design).
 */
export const CAMPAIGNS = {
  // General contact / muse inquiries -> default AC list (AC_LIST_ID).
  default: { listKey: '', label: 'General inquiry' },
  // Engagement giveaway -> AC_LIST_ID_GIVEAWAY (list 54).
  giveaway: { listKey: 'giveaway', label: 'Engagement giveaway' },
  // Wedding inquiries -> AC_LIST_ID_WEDDINGS (list 55).
  weddings: { listKey: 'weddings', label: 'Wedding inquiry' },
} as const satisfies Record<string, Campaign>;

export type CampaignName = keyof typeof CAMPAIGNS;

/** The `list` value a form should post for a given campaign ('' = default list). */
export const listKeyFor = (name: CampaignName): string => CAMPAIGNS[name].listKey;
