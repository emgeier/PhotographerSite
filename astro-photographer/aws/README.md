# AWS deploy runbook — The Glam Muse Experience

This deploys the static Astro site and the ActiveCampaign lead-capture proxy with
a single CloudFormation template, `aws/cloudformation/site.yaml`:

- a **private** S3 site bucket + a private S3 media bucket, both served only through
  CloudFront via Origin Access Control (OAC);
- a CloudFront distribution (ACM HTTPS, `index.html` root object, a clean-URL
  CloudFront Function) whose default behavior serves the site origin and whose single
  `/media/*` behavior serves the media origin;
- an API Gateway HTTP API + Lambda (the AC proxy), with the AC API key held in
  Secrets Manager and read server-side at runtime;
- least-privilege IAM (the Lambda role may read only the one secret, plus logging).

The site stays `output: 'static'` — there is no SSR runtime and no database.

## 0. Prerequisites

- An **ACM certificate in `us-east-1`** (CloudFront requires us-east-1 regardless of
  the stack region) — have its ARN ready for `AcmCertificateArn`.
- The GitHub **repo (`owner/name`) and branch** for the CMS backend.
- ActiveCampaign account **API base URL** (e.g. `https://acct.api-us1.com`), **list id**,
  and optionally the **custom-field ids** (reason/more/feel/hear) and **tag ids**.
- AWS CLI configured with credentials for the target account/region.
- `node`/`npm` for the site build.

## 1. Validate the template

```bash
aws cloudformation validate-template --template-body file://aws/cloudformation/site.yaml
```

If you lack credentials for `validate-template`, lint instead:

```bash
pip install cfn-lint && cfn-lint aws/cloudformation/site.yaml
```

> Validator used during implementation: **cfn-lint 1.57.2** (no AWS credentials were
> available in the build environment, so `validate-template` could not be run there).
> cfn-lint reported no errors. The only warnings are advisory: the `nodejs20.x` runtime
> deprecation notice (the handler deliberately targets Node 20 for its global `fetch`;
> revisit when AWS forces an upgrade) and W3002 (the Lambda `Code` points at a local
> path, which `aws cloudformation deploy` / `package` resolves at deploy time).

## 2. Deploy the stack

`aws cloudformation deploy` packages the local Lambda code (`aws/lambda/activecampaign/`)
and creates/updates the stack. Leave `ContactSuccessUrl` empty on first bring-up — the
no-JS form fallback returns a minimal inline HTML page until the CloudFront domain is known.

```bash
aws cloudformation deploy \
  --template-file aws/cloudformation/site.yaml \
  --stack-name glam-muse \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AcApiUrl='https://luisquintanastudio.api-us1.com' \
    AcListId='53' \
    AcTags='' \
    AcFieldReason='' AcFieldMore='' AcFieldFeel='' AcFieldHear='' \
    AllowedOrigin='*' \
    ContactSuccessUrl='' \
    AcmCertificateArn='arn:aws:acm:us-east-1:<acct>:certificate/<id>' \
    CmsRepo='emgeier/PhotographerSite' \
    CmsBranch='main' \
    DomainName='muse.luisquintanastudio.com'
    CreateGitHubOidcProvider
```

> `AllowedOrigin='*'` is a bring-up default only. **TODO: restrict `AllowedOrigin` to the
> CloudFront distribution domain (`https://dXXXX.cloudfront.net` or the custom domain)
> before production.** See step 9.

Read the Outputs after deploy:

```bash
aws cloudformation describe-stacks --stack-name glam-muse \
  --query 'Stacks[0].Outputs' --output table
```

Outputs: `CloudFrontDomainName`, `ApiEndpoint`, `SiteBucketName`, `MediaBucketName`,
`AcSecretArn`, `CmsRepo`, `CmsBranch`.

## 3. Set the real AC key out-of-band

The template ships the secret with a bare-string placeholder (`REPLACE_ME`). The key never
transits CloudFormation. Set the real value directly on the secret:

```bash
aws secretsmanager put-secret-value \
  --secret-id '<AcSecretArn from Outputs>' \
  --secret-string '<the real ActiveCampaign API key>'
```

The Lambda reads `SecretString` verbatim as the API token (bare string, no JSON). Until a
real value is set, the Lambda returns `500 server_misconfigured`.

## 4. Point the site at the endpoint

Copy the `ApiEndpoint` Output into the site build env:

```bash
# in astro-photographer/.env (and the host/CI build env)
PUBLIC_AC_FORM_ENDPOINT=https://<apiId>.execute-api.<region>.amazonaws.com/ac/subscribe
```

This is the only client-visible AC value (a URL, not a secret).

## 5. Build and verify no secret leaked

```bash
npm run build

# The endpoint URL should appear in dist/, and no non-PUBLIC AC value should:
grep -r 'execute-api' dist/            # expect: the endpoint URL (inquire page)
grep -rE 'REPLACE_ME|Api-Token|AC_API_KEY|AC_LIST_ID|AC_FIELD_|api-us1\.com' dist/  # expect: nothing
```

## 6. Upload the site and media

```bash
# Site: all built pages + /images/* art go to the SITE bucket.
aws s3 sync dist/ s3://photographer-site-sitebucket-ablzoszzaysf --delete

# Media: large/externally-managed files (muse films, future photo drops) go to the
# MEDIA bucket under the media/ key prefix. Reachable at
# https://<CloudFrontDomainName>/media/<path>.mp4 (the videoUrl shape).
aws s3 cp heather-film.mp4 s3://<MediaBucketName>/media/heather-film.mp4
```

> Routing invariant: `/images/*` stays on the **site** origin. Do **not** place site art
> under `/media` or add an `/images/*` CloudFront behavior pointing at the media bucket —
> that would 403/404 every site image.

## 7. Invalidate the CloudFront cache

```bash
aws cloudfront create-invalidation \
  --distribution-id <distribution id> \
  --paths '/*'
```

(The distribution id is in the CloudFront console or
`aws cloudfront list-distributions`.)

## 8. Smoke test

- Load `https://<CloudFrontDomainName>/` and a clean URL like `/stories/heather`.
- Submit the inquire form (JS on and off) and confirm a lead appears in ActiveCampaign.
- `OPTIONS` the endpoint and confirm the CORS headers.

## 9. Harden CORS + the no-JS redirect (redeploy)

Once the CloudFront (or custom) domain is known, redeploy to resolve both TODOs:

```bash
aws cloudformation deploy \
  --template-file aws/cloudformation/site.yaml \
  --stack-name glam-muse \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AllowedOrigin='https://<cloudfront-or-custom-domain>' \
    ContactSuccessUrl='https://<cloudfront-or-custom-domain>/inquire' \
    # ...plus the same AcApiUrl/AcListId/AcmCertificateArn/CmsRepo/CmsBranch as before
```

`ContactSuccessUrl` makes the no-JS fallback land on `/inquire?sent=1` (success) or
`/inquire?sent=0&error=<code>` (failure) instead of inline HTML.

## 10. CMS backend + OAuth

- Fill `public/admin/config.yml` `backend.repo` and `backend.branch` (replace the
  `TODO-owner/TODO-repo` / `TODO-branch` placeholders), then rebuild/upload.
- Provision a GitHub OAuth gateway (recommended: the external gateway path in the project
  `README.md`); nothing OAuth-related ships in this template.
- Confirm `/admin` loads and can commit.
- **Editor invariant:** exactly one muse must have `Featured` on, and that muse must fill
  `Featured paragraph` — otherwise the featured block falls back to Heather's default
  sentence. Each muse Markdown filename is its route slug.

## 11. CI/CD — GitHub Actions deploy via OIDC

`.github/workflows/deploy.yml` (at the **git repo root**, which is the parent of
`astro-photographer/`) builds the site and deploys it on every push to `main` that
touches `astro-photographer/**`. It authenticates with **GitHub OIDC** assuming an IAM
role — no AWS access keys are stored in GitHub.

This replaces the manual steps 5–7 (build, `s3 sync`, invalidate) once set up. It does
**not** manage the CloudFormation stack itself; infra changes still go through
`aws cloudformation deploy` (or the console).

### 11a. Create the deploy role (one time, in the stack)

Redeploy the stack with the `GitHubRepo` parameter set. This creates the OIDC provider
and a least-privilege role that may only write the site bucket and invalidate this
distribution.

```bash
aws cloudformation deploy \
  --template-file aws/cloudformation/site.yaml \
  --stack-name glam-muse \
  --capabilities CAPABILITY_IAM \
  --region us-east-2 \
  --parameter-overrides \
    GitHubRepo='emgeier/PhotographerSite' \
    GitHubBranch='main' \
    CreateGitHubOidcProvider='true' \
    # ...plus the same Ac*/Cms*/cert params as the prior deploy
```

> **One OIDC provider per account.** An AWS account can have only one provider for
> `token.actions.githubusercontent.com`. If this account already has one (from another
> repo/stack), pass `CreateGitHubOidcProvider='false'` — the role then references the
> existing provider instead of trying to create a duplicate (which would fail the stack).

Read the new Outputs:

```bash
aws cloudformation describe-stacks --stack-name glam-muse --region us-east-2 \
  --query 'Stacks[0].Outputs' --output table
```

You now also get `DistributionId` and `GitHubDeployRoleArn`.

### 11b. Configure GitHub Actions variables

In the repo: **Settings → Secrets and variables → Actions → Variables** (these are
plain *variables*, not secrets — none is sensitive; the role ARN is not a credential and
the endpoint is a public URL):

| Variable | Value (from stack Outputs) |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `GitHubDeployRoleArn` |
| `AWS_REGION` | `us-east-2` |
| `SITE_BUCKET` | `SiteBucketName` |
| `DISTRIBUTION_ID` | `DistributionId` |
| `PUBLIC_AC_FORM_ENDPOINT` | `ApiEndpoint` (leave unset until the stack exists; the form stays inert until it is set and a build runs) |

### 11c. How it runs

- **Trigger:** push to `main` under `astro-photographer/**`, or run it manually from the
  Actions tab (`workflow_dispatch`).
- **Steps:** `npm ci` → `npm run build` (bakes in `PUBLIC_AC_FORM_ENDPOINT`) → assume the
  OIDC role → `aws s3 sync dist/ s3://$SITE_BUCKET --delete` → CloudFront invalidation of
  `/*`.
- **Media is untouched:** the sync targets only the site bucket; `/media/*` lives in the
  separate media bucket and is never pruned by this workflow.

### 11d. Trust scope / security notes

- The role trusts exactly `repo:emgeier/PhotographerSite:ref:refs/heads/main`. Pushes from
  other branches or forks cannot assume it. Widen deliberately (e.g. tags or a second
  branch) by changing `GitHubBranch` / the trust `sub` and redeploying.
- The role's permissions are limited to `s3:PutObject`/`DeleteObject`/`ListBucket` on the
  site bucket and `cloudfront:CreateInvalidation`/`GetInvalidation` on this one
  distribution. It cannot touch the media bucket, the Lambda, or the secret.
- To rotate/revoke access, delete or re-scope the role via a stack redeploy; there are no
  long-lived keys to leak or rotate.

## 12. CMS admin login — AWS-hosted GitHub OAuth relay

Sveltia/Decap's GitHub backend needs a server-side relay to exchange the OAuth
code for a token (the client secret can't live in the static site). This project
hosts that relay **on AWS** — a small Lambda (`aws/lambda/oauth/index.mjs`) on two
routes of the existing HTTP API — so no Cloudflare or third-party service is needed.

It is created only when `OAuthClientId` is set, so it stays dormant otherwise.

### 12a. Create the GitHub OAuth App

GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App:

- **Homepage URL:** `https://<your-cloudfront-domain>` (include `https://`).
- **Authorization callback URL / Redirect URI:** the `OAuthCallbackUrl` stack output,
  i.e. `https://<api-id>.execute-api.us-east-2.amazonaws.com/callback`.
  (The callback is the **API**, not `auth.sveltia.app` — if you set it to the Sveltia
  host earlier, change it to this.)
- Leave Device Flow / wildcard / token expiry **unchecked**.

Register, then copy the **Client ID** and generate a **Client secret**.

> Chicken-and-egg: the callback URL contains the API id, which you only know after the
> stack is deployed with OAuth on. Deploy once (step 12b) to get `OAuthCallbackUrl`, then
> paste it into the OAuth App. The App can be edited after creation.

### 12b. Deploy the relay

Upload the OAuth Lambda zip to the same bucket as the AC zip, then redeploy with the
client id set:

```bash
# zip (only index.mjs; SDK is bundled in nodejs18.x) and upload
(cd aws/lambda/oauth && zip -j ../../oauth-lambda.zip index.mjs)
aws s3 cp aws/oauth-lambda.zip s3://muse-photographer-site/oauth-lambda.zip --profile muse

aws cloudformation deploy \
  --template-file aws/cloudformation/site.yaml \
  --stack-name glam-muse --region us-east-2 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    OAuthClientId='<GitHub OAuth App client id>' \
    # ...plus the same Ac*/Cms*/GitHub* params as the prior deploy
```

Console path: upload `oauth-lambda.zip` to the bucket via the S3 console, then upload the
edited `site.yaml` and set `OAuthClientId` in the Parameters step.

Read the new Outputs: `OAuthBaseUrl`, `OAuthCallbackUrl`, `OAuthSecretArn`.

### 12c. Set the client secret out-of-band

Like the AC key, the OAuth **client secret** ships as a `REPLACE_ME` placeholder and is
set directly on the secret (never through CloudFormation):

```bash
aws secretsmanager put-secret-value \
  --secret-id '<OAuthSecretArn>' \
  --secret-string '<the GitHub OAuth App client secret>' \
  --profile muse
```

Until a real value is set, `/callback` returns `server_misconfigured`.

### 12d. Point the CMS at the relay and rebuild

In `public/admin/config.yml`, set `base_url` to the `OAuthBaseUrl` output (replace the
`REPLACE-API-ID` placeholder). `auth_endpoint: /auth` is already set. Then rebuild and
redeploy the site so `/admin/config.yml` on CloudFront carries the real URL:

```bash
npm run build
aws s3 sync dist/ s3://<SiteBucketName> --delete --profile muse
# Invalidate ALL paths: rebuilds change the content-hashed /_astro/*.css|js names,
# and --delete removes the old ones. Invalidating only /admin/* leaves stale page
# HTML cached that still links the deleted hashes -> unstyled pages until TTL.
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths '/*' --profile muse
```

### 12e. Test

Open `https://<your-cloudfront-domain>/admin/`, click **Login with GitHub**. A popup goes
to `/auth` → GitHub → `/callback`, which posts the token back and closes. The CMS then
loads the muses collection. If login fails, check the OAuth Lambda's CloudWatch logs
(`/aws/lambda/<stack>-OAuthFunction-*`): `server_misconfigured` = secret not set (12c);
`exchange_failed` = client id/secret or callback URL mismatch with the OAuth App.

## 13. Domains & the weddings subdomain — manage via CloudFormation, NOT the console

The CloudFront **aliases** and **viewer certificate** are managed by this template
(`DomainName`, `WeddingsDomainName`, `AcmCertificateArn` → the distribution's `Aliases`
and `ViewerCertificate`). CloudFormation treats the template + the parameters you pass as
the source of truth, so **a stack redeploy overwrites anything you changed in the
CloudFront console** for those properties (configuration drift is reset on deploy).

> ⚠️ **Do not set the domain alias or certificate in the CloudFront console.** Set them
> through these parameters. If you set them only in the console and later redeploy
> *without* passing the matching parameters, CloudFormation reverts the alias/cert to the
> template defaults (empty) — which **removes the alias and reverts to the default
> `*.cloudfront.net` certificate**, taking the custom domain offline.

### 13a. Parameters that drive domains

| Parameter | Example | Effect |
|---|---|---|
| `DomainName` | `muse.luisquintanastudio.com` | Primary alias → serves `/index.html` (muse home). |
| `WeddingsDomainName` | `weddings.luisquintanastudio.com` | Second alias. The `CleanUrlFunction` rewrites this host's root `/` → `/weddings/index.html`. Deeper paths (e.g. `/inquire`) resolve normally for both hosts. |
| `AcmCertificateArn` | `arn:aws:acm:us-east-1:…:certificate/…` | Viewer cert. **MUST cover BOTH hosts** — use a SAN cert listing both names, or a wildcard `*.luisquintanastudio.com`. Must be in **us-east-1**. |

`aws cloudformation deploy` resets any parameter you don't pass to its template `Default`
(empty for the domain/cert params) — it does **not** silently keep previous values. So on
every redeploy you must pass **all** params you want kept.

### 13b. Before redeploying: capture the current parameters

So you don't drop anything, print the stack's current parameters and reuse them:

```bash
aws cloudformation describe-stacks --stack-name glam-muse --region us-east-2 \
  --query 'Stacks[0].Parameters' --output table
```

If `DomainName` / `AcmCertificateArn` show up **empty** here but the custom domain works
live, that confirms console drift (the template thinks there's no alias/cert). You will
*formalize* the console state by passing the real values below.

### 13c. Issue a cert that covers both hosts (one time)

In **ACM, region us-east-1** (CloudFront requirement), request/validate either:
- a SAN cert for `muse.luisquintanastudio.com` **and** `weddings.luisquintanastudio.com`, or
- a wildcard `*.luisquintanastudio.com` (covers both, plus any future subdomain).

Copy its ARN for `AcmCertificateArn`.

### 13d. Preview the change set first (recommended, non-destructive)

Generate but DON'T execute the change set, then review the `Aliases` / `ViewerCertificate`
diffs before applying:

```bash
aws cloudformation deploy \
  --template-file aws/cloudformation/site.yaml \
  --stack-name glam-muse --region us-east-2 \
  --capabilities CAPABILITY_IAM \
  --no-execute-changeset \
  --parameter-overrides \
    DomainName='muse.luisquintanastudio.com' \
    WeddingsDomainName='weddings.luisquintanastudio.com' \
    AcmCertificateArn='arn:aws:acm:us-east-1:<acct>:certificate/<id>' \
    AcApiUrl='https://acct.api-us1.com' AcListId='7' AcTags='' \
    AcFieldReason='' AcFieldMore='' AcFieldFeel='' AcFieldHear='' \
    AllowedOrigin='https://muse.luisquintanastudio.com' \
    ContactSuccessUrl='https://muse.luisquintanastudio.com/inquire' \
    CmsRepo='emgeier/PhotographerSite' CmsBranch='main' \
    GitHubRepo='emgeier/PhotographerSite' GitHubBranch='main' \
    CreateGitHubOidcProvider='false' \
    OAuthClientId='<github-oauth-client-id>'
```

Review the printed change set (or open it in the CloudFormation console). Confirm the only
distribution changes are: `Aliases` → `[muse…, weddings…]`, `ViewerCertificate` → your
cert, and the `CleanUrlFunction` code update. Then execute the named change set it prints,
or re-run the same command **without** `--no-execute-changeset` to apply.

> Replace every `Ac*/Cms*/GitHub*/OAuth*` value above with the real ones from §13b — these
> are placeholders. Omitting any of them resets it to its template default on deploy.

### 13e. DNS

Point the subdomains at the CloudFront distribution domain (`CloudFrontDomainName` output):
- `muse.luisquintanastudio.com` → the distribution (CNAME, or Route 53 A/AAAA ALIAS).
- `weddings.luisquintanastudio.com` → the **same** distribution (one distribution serves
  both hosts; the function routes by `Host`).

### 13f. Ship the weddings page + verify

The weddings home lives at `src/pages/weddings/index.astro` → builds to
`dist/weddings/index.html`. Push to `main` (the Actions workflow builds + syncs), or sync
manually. Then:

```bash
# muse root -> muse home; weddings root -> weddings home
curl -sI https://muse.luisquintanastudio.com/        | grep -i '^HTTP'
curl -sI https://weddings.luisquintanastudio.com/    | grep -i '^HTTP'
# both resolve shared clean URLs
curl -sI https://weddings.luisquintanastudio.com/inquire | grep -i '^HTTP'
```

If a host 403s on `/`, re-check that the cert covers it and the alias is present on the
distribution (`aws cloudfront get-distribution-config --id <DistributionId>`).
