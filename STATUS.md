# STATUS — [TESTED]

> **agent-qa (2026-11-20):** API test suite executed against `http://localhost:3000`
> — **55 / 55 passing (100%)**, 0 open defects. Evidence: `qa-testing/04_test_results.md`,
> `qa-testing/05_Bug_Log.md`. See the "QA verification" section at the end of this file.
> The build state below is the original `[READY FOR QA]` snapshot from `agent-code`.

**Project:** PERITEC B2B Sales Support System (MVP)
**Location:** `peritec-mvp/`
**Last updated:** 2026-11-20
**State:** Backend, seeded data, acceptance suite and Angular frontend are all
green. Running locally and verified in a headless browser across all four roles.

---

## What is done

### Backend — `peritec-mvp/backend`
- Node.js + TypeScript (`tsx`) + Express + Mongoose, database
  `mongodb://localhost:27017/Peritec`.
- Models: reuses the existing `User` collection; adds `Company`, `Product`,
  `Application`, `RFQ`, `Quotation`, `Order`, `ProcessingLog`, `TransactionDoc`
  (plus `Counter` for code generation and `ContactRequest`).

| Feature area | Notes |
|---|---|
| Auth | JWT + bcrypt, `/api/auth/login`, `/register`, `/me` |
| Public web | applications, product list/detail, compare, RFQ submit, RFQ summary, contact |
| Customer portal | overview, RFQ history/detail, quote confirm/adjustment, order tracking, documents, company |
| Internal workspace | RFQ queue, assignment, technical checks, notes, quotes, orders, ETA, delivery, companies, users |
| Quotations | v1 create, revise (new version, keep old), send, immutable sent versions |
| Orders | create from confirmed quote, 5-stage progression, ETA with mandatory reason |
| Files | on-demand quotation / order / equipment PDFs via `pdfkit` |

Business rules BR-02, BR-03, BR-05, BR-08, BR-09, BR-10, BR-11, BR-12, BR-13
are enforced server-side.

### Frontend — `peritec-mvp/frontend`
- Angular 22 (standalone components) + Tailwind 3.4, Vietnamese UI, Peritec
  navy/blue theme. Runs on port 4200 with a dev proxy to the API on 3000.
- Public: home, product list, product detail, compare (max 3 with
  “chưa xác nhận” handling), 3-step RFQ cart, RFQ success, contact, login,
  register.
- Customer portal: overview, RFQ list/detail, orders list/tracking, documents,
  company.
- Internal workspace: dashboard/queue, RFQ detail (assign, checks, quotes,
  notes, status, customer-visible panel), orders list/detail (stages, ETA,
  delivery, documents), companies.

### Verification
- `npm run smoke` (backend): **44 / 44 passing**.
- `npx tsc --noEmit` (backend): clean.
- `npm run build` (frontend): succeeds. Only a budget warning — the initial
  bundle is 562 kB against a 500 kB warning threshold (build still succeeds;
  the error threshold is 1 MB).
- Headless browser pass over all public, portal and workspace pages as all four
  roles: pages render with data, zero console errors, zero failed requests.
  Engineering role correctly shows disabled assignment and no quote controls.
- End-to-end UI flows verified: compare with two devices, RFQ cart submit
  (created `RFQ-261120-005`/`006`), customer quote/order views.

## How to run

```bash
# 1. Backend
cd peritec-mvp/backend
npm install
npm run seed      # reset demo data
npm run dev       # http://localhost:3000  (watch mode)

# 2. Frontend (new terminal)
cd peritec-mvp/frontend
npm install       # add --ignore-scripts if npm blocks install scripts
npm start         # http://localhost:4200  (proxies /api to :3000)
```

Health check: `http://localhost:3000/api/health` → `{"status":"ok","db":"connected"}`.

### Test accounts (password `Peritec@123`)

| Email | Role |
|---|---|
| `admin@peritec.vn` | admin |
| `sales@peritec.vn` | sales |
| `engineering@peritec.vn` | engineering |
| `customer@anviet.example` | customer (An Việt) |

## Known limitations / notes

- **Reseed before a demo.** `npm run smoke` mutates the database. Run
  `npm run seed` afterwards to restore the canonical demo records.
- **Backend is not in watch mode by default.** `npm run start` serves once;
  use `npm run dev` for auto-reload, or restart the process after backend edits.
- Email delivery and PDF “sending” are mocked — PDFs are generated on demand and
  streamed, no mail is actually sent.
- Quote/session tokens live in `localStorage`; this is an MVP, not a hardened
  production auth setup.
- Frontend build exceeds the 500 kB initial-bundle warning threshold (not an
  error). Route-level lazy loading would remove it if desired.
- ROOT `/` serves the public site; the customer portal is at `/portal` and the
  internal workspace at `/workspace`.

## Source of truth

- API contract: `../CONTRACT.md` (repo root)
- Acceptance tests: `peritec-mvp/backend/src/seed/smoke.ts`
- Canonical seed data: `peritec-mvp/backend/src/seed/seed.ts`

---

## QA verification — `agent-qa` — [TESTED]

**Executed:** 2026-11-20 · **Runner:** `qa-testing/03_run_api_tests.mjs` (Node.js v24.20.0)
**Target:** `http://localhost:3000/api` (DB `connected`) · **Result:** **55 / 55 passed (100%), 0 open defects**

| Category | Cases | Passed |
|---|---|---|
| Functional | 23 | 23 |
| Business-rule / negative | 16 | 16 |
| Security / RBAC | 11 | 11 |
| Performance (NFR-01) | 5 | 5 |

**Verified end-to-end:** guest + customer RFQ submission → quotation v1 → send → revise v2 (BR-09, v1 preserved) → customer confirm → order creation with 5 import stages (BR-11) → stage progression; Engineering blocked on create/send/revise/assign/customer-notes (BR-08 → 403); cross-company access blocked (BR-12 → 403); sent quote PUT → 409; expired quote confirm → 409; ETA without reason → 422; stage-5-first → 409.

**Measured response times (NFR-01):** product list 17 ms (≤3000), product detail 15 ms (≤3000), filter 9 ms (≤1200), RFQ submit 23 ms, login 296 ms — all well within threshold.

**Artifacts (qa-testing/):** `01_Test_Plan_and_RTM.md`, `02_Test_Cases.csv`, `03_run_api_tests.mjs`, `04_test_results.md`, `05_Bug_Log.md`, `06_Evaluation_Metrics_Template.md`.

**Note for `agent-docs`:** read `qa-testing/04_test_results.md` and `qa-testing/05_Bug_Log.md` for all experimental figures. Re-run `npm run seed` in `peritec-mvp/backend` to restore canonical demo data after this mutating run.
