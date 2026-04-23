# wegoagane web (Phase 1)

Vite + React + React Router. Entry flows: **Release Spirit**, **Draft a Run**, **Lucky Roll**.

**M2:** Original **class icons** (`src/icons/`), **Memorial / Destiny / share combo** card shells (`src/components/cards/`), static **`src/content/cardFixtures.ts`**. QA route: **`/design/cards`** (also linked from home).

**M3-M7 foundation (branch):** result pages call `POST /api/v1/recommend` (proxy to Worker in local dev). If API is unavailable, UI falls back to local fixtures.

```bash
npm install
npm run dev    # http://localhost:5173
npm run build
npm run lint
```

Run API locally in another terminal:

```bash
cd packages/api
npm install
npm run db:migrate:local
npm run dev
```

Deploy: [../docs/deploy-wegoagane-com.md](../docs/deploy-wegoagane-com.md)
