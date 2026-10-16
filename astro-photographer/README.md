# The Glam Muse Experience — Astro homepage prototype

Static Astro implementation of the supplied homepage design, prepared for GitHub + Cloudflare Pages.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Set `PUBLIC_ADOBE_FONTS_PROJECT` to the photographer's Adobe Fonts Web Project ID containing IvyPresto Display. The CSS expects Adobe's family name `ivypresto-display`. Manrope is bundled locally through `@fontsource-variable/manrope`.

## Production build

```bash
npm run build
```

Cloudflare Pages settings:
- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `PUBLIC_ADOBE_FONTS_PROJECT=<Adobe project ID>`

## Photography placeholders

Replace files in `public/images/` or update the paths in `src/pages/index.astro`. For production, use properly sized AVIF/WebP/JPEG derivatives rather than camera originals.

## Inquire form (ActiveCampaign)

The inquire form (`src/pages/inquire.astro`) submits to a serverless ActiveCampaign
proxy — an AWS Lambda behind an API Gateway HTTP API. The AC API key never touches
the client; it lives in AWS Secrets Manager and is read server-side by the Lambda.

- Set `PUBLIC_AC_FORM_ENDPOINT` to the deployed `/ac/subscribe` URL (the `ApiEndpoint`
  CloudFormation Output). This is the **only** client-visible AC value — a URL, not a
  secret. All other AC config (`AC_API_KEY`, `AC_API_URL`, `AC_LIST_ID`, `AC_TAGS`,
  `AC_FIELD_*`) lives on the Lambda, never in a `PUBLIC_` var or the client bundle.
- The form works without JavaScript via a native `method="POST"` fallback; with JS it is
  progressively enhanced to a `fetch` submit with inline sending/success/error states.
- Lambda source and offline tests live under `aws/lambda/activecampaign/`
  (`npm run test:lambda`). Infrastructure and the full deploy runbook are in `aws/README.md`.

## Content management (Git-based CMS)

The six muse stories are an Astro content collection (`src/content.config.ts`, entries in
`src/content/muses/*.md`). `stories.astro` and `stories/[slug].astro` read the collection
via `getCollection`; the route slug is each entry's filename stem (e.g. `heather.md` →
`/stories/heather`).

**CMS choice: Sveltia CMS.** Sveltia is a maintained, drop-in successor to Decap CMS that
keeps full compatibility with Decap's `config.yml` schema, ships a lighter single-file CDN
bundle, and supports the same GitHub backend and OAuth gateway options. The compatibility
means switching back to Decap later is a one-line change in `public/admin/index.html` (swap
the script tag) with no content migration.

### Backend configuration

Edit `public/admin/config.yml`:
- `backend.repo`: set to the client's GitHub repo as `owner/name` (replace `TODO-owner/TODO-repo`).
- `backend.branch`: set to the content branch, e.g. `main` (replace `TODO-branch`).

### OAuth provider setup (documented, not deployed)

The GitHub backend needs an OAuth relay to exchange the login. Pick one; the client
provisions it (nothing OAuth-related ships in this repo or in CloudFormation):

1. **External OAuth gateway (recommended).** A small OAuth relay such as the community
   `sveltia-cms-auth` Cloudflare Worker (or Netlify's git-gateway) holds the GitHub OAuth
   app client id/secret. Point `config.yml` at it with `base_url` / `auth_endpoint`.
2. **Netlify Identity / git-gateway**, if the repo is already Netlify-connected.
3. **GitHub App / fine-grained PAT** flow for a single-author setup.

Create a GitHub OAuth app, set its callback to the chosen gateway, and give the gateway the
client id/secret. See the Sveltia/Decap docs for the exact `base_url`/`auth_endpoint` values.

### Editor invariants

- **Exactly one muse must have `Featured` on, and that muse must fill `Featured paragraph`.**
  The `stories.astro` featured block renders that paragraph verbatim; if the featured muse
  omits it, the page falls back to Heather's default sentence (so it never renders empty, but
  the authored content would be wrong).
- The Markdown **filename is the route slug** (`heather.md` → `/stories/heather`). Renaming a
  file changes the URL.
- **`Video URL`** must be a CloudFront URL of the shape
  `https://<CloudFrontDomainName>/media/<path>.mp4` — served through CloudFront, never a raw
  S3 object URL (OAC blocks direct S3 reads). Leave it blank until real media exists; a blank
  value is omitted from the file, and a non-URL (or one missing `/media/`) fails the build.

Publishing commits to Git and triggers a rebuild (Option A: static, rebuild-on-publish).

## Palette

- Ivory `#F4F0E8`
- Ink `#171717`
- Gold `#B89C74`
- Stone `#D7CEC4`
- Taupe `#A99888`
- Soft white `#FAF9F6`
