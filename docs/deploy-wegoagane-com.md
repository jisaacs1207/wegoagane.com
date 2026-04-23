# Deploy wegoagane.com (Cloudflare Pages)

SPA lives in [`apps/web`](../apps/web). Production build outputs to **`apps/web/dist`**.

## One-time: Cloudflare Pages project

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select repository **`jisaacs1207/wegoagane.com`** (or your fork), production branch **`main`**.
3. **Configure build**

   | Setting | Value |
   |--------|--------|
   | **Root directory (advanced)** | `apps/web` |
   | **Build command** | `npm ci && npm run build` |
   | **Build output directory** | `dist` |
   | **Environment variables** | none required for this milestone |

4. **Save and Deploy** — first build should succeed if CI passes locally.

5. **Custom domains** → **Set up a custom domain** → enter **`wegoagane.com`** (and optionally **`www.wegoagane.com`**) → follow DNS instructions at your registrar (usually CNAME to `*.pages.dev` or the hostname Cloudflare shows).

## SPA routing

[`apps/web/public/_redirects`](../apps/web/public/_redirects) sends all paths to `index.html` with **200** so client-side routes (e.g. `/release-spirit/mood`) work after refresh.

## After you add new CI jobs

If GitHub Actions gains a new **required** job for merges, add it to ruleset **`wegoagane-main-ci`** or run:

```bash
python3 scripts/ruleset_add_required_check.py "Web"
```

(Use the exact job name from the workflow.)

## Local preview (optional)

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173`.

---

*Milestone: M1 usable shell — see [`docs/handoff/STATUS.md`](handoff/STATUS.md).*
