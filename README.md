# Listing Manager

Mobile-first web app for UK sellers: upload item photos, get **AI/vision drafts** for **Facebook Marketplace** and **Vinted**, edit/approve, then publish via the **Playwright listing-publish worker** (or a legacy n8n webhook).

Stack: **Next.js App Router**, TypeScript, Tailwind CSS. Listings + photos persist in a local JSON/file store under `data/`.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — leave webhook URLs blank for demo mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm install
npm run build
npm start
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_DRAFT_WEBHOOK_URL` | No* | Multipart POST target to generate drafts (vision sidecar or n8n) |
| `PUBLISH_WORKER_URL` | No* | Playwright worker `POST /publish` (preferred), e.g. `http://listing-publish:8092/publish` |
| `N8N_PUBLISH_WEBHOOK_URL` | No* | Legacy n8n publish webhook if worker URL unset |
| `PUBLIC_APP_URL` | Recommended | Public app origin for absolute photo URLs sent to the worker |
| `SELLER_POSTCODE` | No | Default `DA3 7PS` |
| `N8N_WEBHOOK_SECRET` | No | Shared secret (`X-Webhook-Secret` header) |

\*If draft URL **or** publish target (`PUBLISH_WORKER_URL` / `N8N_PUBLISH_WEBHOOK_URL`) is missing, the app runs in **demo mode**.

### Browser publish worker

Approve/publish calls `PUBLISH_WORKER_URL` (see sibling repo / folder `listing-publish`). First-time Facebook + Vinted login is documented in that service's README (persistent browser profile; no passwords in git).

## App flows

1. **Home** — list listings with status: `draft_pending` | `ready_for_review` | `published` | `failed`
2. **Create** — multi-photo upload (drag-drop + mobile file/camera) and optional notes
3. **Submit** — `POST` multipart to `N8N_DRAFT_WEBHOOK_URL` (or mock drafts in demo mode)
4. **Review** — side-by-side (desktop) / tabs (mobile) editors for Facebook + Vinted
5. **Approve** — `POST` JSON to `N8N_PUBLISH_WEBHOOK_URL`; status → `published` or `failed`
6. **Async callback** — n8n can also `POST` drafts later to `/api/webhooks/n8n-draft-result`

## n8n wiring contracts

### 1. Draft webhook (app → n8n)

**Outbound:** `POST {N8N_DRAFT_WEBHOOK_URL}`  
**Content-Type:** `multipart/form-data`  
**Headers:** `X-Webhook-Secret: {N8N_WEBHOOK_SECRET}` (if secret set)

| Field | Type | Notes |
|-------|------|-------|
| `listingId` | string | UUID of the listing |
| `notes` | string | Seller notes (may be empty) |
| `photos` | file[] | One or more image parts (field name `photos`, repeated) |

**Synchronous response (optional):** return JSON and the app moves to `ready_for_review` immediately:

```json
{
  "facebook": {
    "title": "Charizard Holo — Pokémon TCG",
    "description": "Near mint. Collection or postage.",
    "category": "Trading Cards",
    "price": 45,
    "condition": "Like new",
    "currency": "GBP"
  },
  "vinted": {
    "title": "Pokémon Charizard Holo",
    "description": "NM condition. Bundle friendly.",
    "category": "Toys & Games",
    "price": 42,
    "condition": "Good",
    "currency": "GBP"
  },
  "error": null
}
```

**Async response:** return `200` with `{ "async": true }` (or any non-draft body). Keep the listing in `draft_pending` until the callback below fires.

On HTTP error, the listing is marked `failed` with the error message.

### 2. Draft result callback (n8n → app)

**Inbound:** `POST /api/webhooks/n8n-draft-result`  
**Content-Type:** `application/json`  
**Headers:** `X-Webhook-Secret: {N8N_WEBHOOK_SECRET}` (required if secret is configured)

```json
{
  "listingId": "uuid-here",
  "facebook": {
    "title": "...",
    "description": "...",
    "category": "...",
    "price": 0,
    "condition": "...",
    "currency": "GBP"
  },
  "vinted": {
    "title": "...",
    "description": "...",
    "category": "...",
    "price": 0,
    "condition": "...",
    "currency": "GBP"
  },
  "error": null
}
```

- If `error` is set and both platform objects are missing → status `failed`
- Otherwise → status `ready_for_review` with the provided drafts

While `draft_pending`, the review page polls every ~2.5s for updates.

### 3. Publish (app → listing-publish worker, preferred)

Fired only after the seller taps **Approve & publish**.

**Outbound:** `POST {PUBLISH_WORKER_URL}` (falls back to `N8N_PUBLISH_WEBHOOK_URL`)  
**Content-Type:** `application/json`

When using the worker:

```json
{
  "listingId": "uuid-here",
  "platforms": ["facebook", "vinted"],
  "photos": ["https://listing-manager.../api/photos/file.jpg"],
  "postcode": "DA3 7PS",
  "facebook": { "title": "...", "description": "...", "category": "...", "price": 45, "condition": "...", "currency": "GBP" },
  "vinted": { "title": "...", "description": "...", "category": "...", "price": 42, "condition": "...", "currency": "GBP" }
}
```

- **2xx** → listing status `published` (URLs stored on `publishUrls` when returned)
- **non-2xx / partial** → status `failed` with worker error code (`login_required`, `captcha`, `timeout`, `partial`)

Photo files live under `data/uploads/` and are served at `/api/photos/{filename}`.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/listings` | List all listings |
| `POST` | `/api/listings` | Create listing (`multipart`: `notes`, `photos`) |
| `GET` | `/api/listings/:id` | Get one listing |
| `PATCH` | `/api/listings/:id` | Update draft fields |
| `POST` | `/api/listings/:id/submit` | Trigger draft webhook / demo mocks |
| `POST` | `/api/listings/:id/approve` | Trigger publish webhook |
| `POST` | `/api/webhooks/n8n-draft-result` | Async draft callback from n8n |
| `GET` | `/api/photos/:filename` | Serve uploaded photo |

## Project layout

```
src/
  app/
    page.tsx                 # Home — listing list
    create/page.tsx          # Upload + submit
    listings/[id]/page.tsx   # Review / approve
    api/...                  # REST + webhook handlers
  components/                # UI pieces
  lib/
    types.ts                 # Shared types
    store.ts                 # JSON + file persistence
    webhooks.ts              # n8n client + demo mode
    mock.ts                  # Mock draft generator
data/
  listings.json              # Created at runtime
  uploads/                   # Photo files
.env.example
```

## Notes

- No secrets belong in the repo — use `.env.local` only.
- Persistence is filesystem-based (`data/`); fine for single-node deploys. Swap `src/lib/store.ts` for SQLite/Postgres if you need multi-instance storage.
- Nothing is published without an explicit **Approve & publish** tap.
