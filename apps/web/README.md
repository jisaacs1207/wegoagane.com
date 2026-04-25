# wegoagane web (Phase 1)

Vite + React + React Router. Entry flows: **Release Spirit**, **Draft a Run**, **Lucky Roll**.

**M2:** Original **class icons** (`src/icons/`), **Memorial / Destiny / share combo** card shells (`src/components/cards/`), static **`src/content/cardFixtures.ts`**. QA route: **`/design/cards`** (also linked from home).

**M3-M7 foundation (live):** result pages call `POST /api/v1/recommend` (proxy to Worker in local dev). If API is unavailable, UI falls back to local fixtures.

```bash
npm install
npm run dev    # http://localhost:5173
npm run build
npm run lint
npm run test           # Vitest + Testing Library
npm run test:e2e       # Playwright (uses `vite preview`; see playwright.config.ts)
```

E2E specs live under **`e2e/`**. Install browsers once: `npx playwright install chromium`.

**High-signal modules:** [`src/lib/sessionKeys.ts`](src/lib/sessionKeys.ts) (storage keys), [`src/lib/recommendClient.ts`](src/lib/recommendClient.ts) (API errors → hints), [`src/lib/flowDestinyState.ts`](src/lib/flowDestinyState.ts) (stored destiny for result pages).

Run API locally in another terminal:

```bash
cd packages/api
npm install
npm run db:migrate:local
npm run dev
```

Deploy: [../docs/deploy-wegoagane-com.md](../docs/deploy-wegoagane-com.md) · Route / session / error matrix: [../docs/route-qa-matrix.md](../docs/route-qa-matrix.md)
