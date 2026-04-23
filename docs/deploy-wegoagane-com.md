# Deploy wegoagane.com (Cloudflare Pages)

This guide matches **Cloudflare’s published Pages documentation** as consulted on **April 22, 2026**. Canonical references:

- [Git integration (get started)](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image / v3 build system](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [Monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Serving Pages (SPA behavior)](https://developers.cloudflare.com/pages/configuration/serving-pages/)

The production app in this repo is a Vite + React SPA under [`apps/web`](../apps/web). The build writes static assets to **`apps/web/dist`**.

---

## What you are creating

A **Cloudflare Pages** project connected to **Git** (GitHub). Each push to the configured branches triggers a build; production traffic is served from the **production branch** (this repo uses **`main`**).

**Important (Git-connected projects):** Cloudflare states that if you deploy with **Git integration**, you **cannot later switch** that same project to [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/). If you need to stop auto-deploys on every push, use **Settings → Builds → Branch control** to turn off automatic production and/or preview deployments, then deploy with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) as documented under [Disable automatic deployments](https://developers.cloudflare.com/pages/configuration/git-integration/#disable-automatic-deployments).

---

## One-time: create the Pages project

1. Open the Cloudflare dashboard and go to **Workers & Pages** (direct link pattern from Cloudflare docs: [`dash.cloudflare.com/?to=/:account/workers-and-pages`](https://dash.cloudflare.com/?to=/:account/workers-and-pages)—replace `:account` by selecting your account in the UI).
2. Select **Create application** → **Pages** → **Connect to Git**.
3. Sign in with **GitHub** and authorize the [**Cloudflare Workers & Pages** GitHub App](https://github.com/apps/cloudflare-workers-and-pages). Cloudflare recommends limiting the installation to **only the repositories** you intend to build ([GitHub integration — Manage access](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#manage-access)).
4. Choose repository **`jisaacs1207/wegoagane.com`** (or your fork). Private and public repos are supported.
5. Continue to **Set up builds and deployments** (wording may read **Install & Authorize** then **Begin setup** in the wizard).

### Production branch

Set **Production branch** to **`main`** (or your default). You must have pushed at least one branch to the repo for it to appear in the dropdown ([Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/#configure-your-deployment)).

### Configure the build (monorepo subdirectory)

This repository is a **monorepo-style** layout: the site lives in **`apps/web`**, not the repo root. Cloudflare’s entire build pipeline (including dependency install) starts from the **root directory** you configure ([Build configuration — root directory](https://developers.cloudflare.com/pages/configuration/build-configuration/#build-commands-and-directories)).

| Setting | Value | Notes |
|--------|--------|--------|
| **Framework preset** | **React (Vite)** (optional) | Official preset: build command `npm run build`, output **`dist`** ([framework presets table](https://developers.cloudflare.com/pages/configuration/build-configuration/#framework-presets)). You may instead leave preset blank and set commands manually. |
| **Root directory (advanced)** | `apps/web` | Required so installs and builds run inside the Vite app. |
| **Build command** | `npm ci && npm run build` | `npm ci` is stricter and reproducible than `npm install` for CI-like Pages builds; Cloudflare runs whatever command you supply and treats non-zero exit as failure ([build commands](https://developers.cloudflare.com/pages/configuration/build-configuration/#build-commands-and-directories)). |
| **Build output directory** | `dist` | Relative to the **root directory** (`apps/web/dist` on disk). |

**Environment variables:** none are required for the current milestone. You can add keys under **Settings → Environment variables** anytime ([Build configuration — environment variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)).

### Build system (v3) and Node.js

Pages **build image v3** is the current generation; it updates default runtimes (Cloudflare documents a migration path from v2 and deprecation timelines for older images on the [build image](https://developers.cloudflare.com/pages/configuration/build-image/) page). For **Node.js**, v3 documents a default of **22.16.0** (as of the doc revision we used), with overrides via **`NODE_VERSION`**, **`.nvmrc`**, or **`.node-version`**.

This repo’s GitHub Actions **Web** job uses Node **22**; aligning Pages (default or explicit pin) avoids “works in CI, fails on Pages” drift.

**v3 limitations** called out in Cloudflare’s docs include: Node codenames (e.g. `lts/hydrogen`) not supported; no automatic detection of Node or package managers from `package.json` **`engines`** alone—**pin explicitly** if you rely on a specific version ([v3 build system](https://developers.cloudflare.com/pages/configuration/build-image/#v3-build-system)).

### Monorepo: duplicate builds (optional)

By default, **any** change in the repo can trigger a build for this Pages project ([Monorepos — Builds](https://developers.cloudflare.com/pages/configuration/monorepos/#builds)). To skip builds when unrelated paths change, configure [**build watch paths**](https://developers.cloudflare.com/pages/configuration/build-watch-paths/) (and/or branch controls). Monorepo support requires **build system v2 or later** ([Monorepos — Limitations](https://developers.cloudflare.com/pages/configuration/monorepos/#limitations)); new projects should be on v3.

### Save and first deploy

Select **Save and Deploy**. Logs show dependency install, build, and upload. When finished, you get a **`*.pages.dev`** hostname for the project ([first deploy](https://developers.cloudflare.com/pages/get-started/git-integration/#your-first-deploy)).

---

## Custom domain: wegoagane.com

Add domains only through the Pages UI so Cloudflare can attach certificates and routing correctly ([Add a custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-domain)).

1. **Workers & Pages** → your **Pages project** → **Custom domains** → **Set up a domain** → enter **`wegoagane.com`** (and/or **`www.wegoagane.com`**) → **Continue**.

### Apex (`wegoagane.com`)

For an **apex** domain, Cloudflare’s docs require the domain to exist as a **zone on the same Cloudflare account** as the Pages project, with **nameservers pointed to Cloudflare** ([apex domain](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-apex-domain), [full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)). After nameservers are correct, Cloudflare can create the needed DNS (including CNAME-style flattening at the edge where applicable).

### Subdomain only (`www`)

If you use **only** a subdomain and do **not** move the whole zone to Cloudflare, you must add a **CNAME** at your DNS provider per Cloudflare’s instructions—but you must still **complete the “Set up a domain” flow in the Pages dashboard first**. A CNAME alone, without associating the domain in Pages, can produce **522** errors ([custom CNAME](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-cname-record), [522 note](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-cname-record)).

### CAA records

Restrictive **CAA** records can block certificate issuance. If TLS fails when adding a custom domain, add the CAA entries Cloudflare documents ([CAA known issue](https://developers.cloudflare.com/pages/configuration/custom-domains/#caa-records), [CAA FAQ](https://developers.cloudflare.com/ssl/faq/#caa-records)).

### Deleting the project or a domain

Before deleting a project that used a custom domain, clean up DNS and remove the domain in **Custom domains** as documented ([delete custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/#delete-a-custom-domain), [delete project](https://developers.cloudflare.com/pages/get-started/git-integration/#delete-a-project)).

---

## SPA routing and refresh

Cloudflare Pages **single-page application** behavior: if there is **no** top-level **`404.html`**, Pages treats the site as an SPA and **matches incoming paths to the root** so client routes work ([SPA rendering](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)).

[`apps/web/public/_redirects`](../apps/web/public/_redirects) is intentionally **comment-only**. A Netlify-style line **`/* /index.html 200`** is **rejected** on Pages deploy (“infinite loop” — `index.html` re-matches after normalization), so it is not used here. Rely on **built-in SPA behavior** above; add real redirect lines only when you have concrete paths ([Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)).

**Caching:** Cloudflare warns that heavy custom caching on the **custom domain** can interfere with **redirects** or **Pages Functions** and cause stale responses ([Caching and performance](https://developers.cloudflare.com/pages/configuration/serving-pages/#caching-and-performance)).

---

## GitHub integration behavior (useful day-to-day)

- **Preview deployments:** Opening a PR builds a **unique preview URL** that updates as you push to the branch ([Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)). **PRs from forks** do not get preview URLs ([GitHub integration — Preview URLs](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#preview-urls)).
- **Skip a Pages build** with a commit subject prefix such as **`[CI Skip]`**, **`[Skip CI]`**, or **`[CF-Pages-Skip]`** (case-insensitive; see [Skipping a build](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message)).
- **Check runs** in GitHub show Pages build status when a build runs; if a build is skipped (skip tag, watch paths, branch controls), a check may not appear ([Check runs](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#check-runs)).

Production branch and preview branch rules are under **Settings → Builds → Branch control** ([custom branches](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#custom-branches)).

---

## Injected build environment variables

Cloudflare injects variables such as **`CI=true`**, **`CF_PAGES=1`**, **`CF_PAGES_COMMIT_SHA`**, **`CF_PAGES_BRANCH`**, and **`CF_PAGES_URL`** ([table](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)). Use them for build-time metadata (for example, stamping commit SHA into a debug banner).

---

## GitHub Actions vs Cloudflare Pages

**GitHub Actions** (this repo’s **Web** job) and **Cloudflare Pages** builds are **separate**. Keep them aligned on Node version and install/build commands so green CI correlates with green Pages deploys.

---

## After you add new required CI jobs

If GitHub gains a new **required** job for merges, add it to ruleset **`wegoagane-main-ci`** or run:

```bash
python3 scripts/ruleset_add_required_check.py "Web"
```

Use the **exact** job name from the workflow YAML.

---

## Local preview

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173` (Vite default).

---

*Milestone: M1 usable shell — see [`docs/handoff/STATUS.md`](handoff/STATUS.md). Doc refreshed against Cloudflare Pages developer docs, April 22, 2026.*
