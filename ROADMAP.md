# Airlock App — End-to-End Roadmap

**Goal:** Make the platform fully functional and ready for real-time, end-to-end use.  
**Current state:** Parts 1–3 complete (registry live, mock/fallback stripped, evaluation engine live).  
**Branch:** `foundation`  
**Date:** 2026-11-27

---

## 1. EXECUTIVE SUMMARY

The app has a real Supabase backend with RLS, live engines for registry (suppliers, agents, policies, invoices) and evaluation (Attack Lab), and a strict no-mock-data policy. Remaining work: wire authentication and onboarding to real identity, build the in-progress modules (payment requests, activity, approvals, metrics, chain), add the shared pure evaluator to the evaluation engine, create the `payment_requests`/`evaluations` tables and `paid_today` view, and run end-to-end verification.

---

## 2. WHAT'S DONE (Parts 1–3)

| Part | What | Commit | Evidence |
|---|---|---|---|
| Part 1 | Registry migration `0003_registry.sql` pushed to airlock-dev; live registry engine; Suppliers/Invoices/Agents pages; `registry` feature → live | `2461d07` | Migration list shows `0003` applied; vitest 83 passed |
| Part 2 | Stripped all mock/fallback from engines; deleted mock.ts engines, seed.ts, fallback files; `engineRegistry.ts` rewritten (live\|degraded only); baseline 110→40 | `c7fedf6` | `grep mock src` shows only comments/vitest mocks; vitest 40 passed |
| Part 3 | AttackLab wired to real data via registry + evaluation engines; `evaluation` feature → live | `f004503` | AttackLab fetches real suppliers/agents/invoices; vitest 40 passed |
| Fix | Baseline notes corrected; SettingsPage "mock" text fixed | `51a9bad` | Baseline notes say 7 not 8 |
| Fix | Pure `evaluate()` function in `packages/shared` with 11 tests against all 10 golden vectors | `e04800c` | `packages/shared` vitest 92 passed |
| Docs | `docs/audit.md`, `docs/UI-HANDOFF.md`, `scripts/css-usage.mjs`, `docs/ui/css-usage.md` | `a11682f`, `300089b` | Both docs committed and pushed |

Current `FEATURES` map:
- auth: live, onboarding: live, registry: live, evaluation: live
- requests: in_progress, approvals: in_progress, chain: in_progress, metrics: in_progress

---

## 3. REMAINING WORK (PHASED)

### Phase 1: Authentication & Onboarding Wiring (no new module, finish existing)

| Task | Description | Files affected |
|---|---|---|
| 1.1 | Implement `connectAndSignIn()` on `authEngine` (combine `list()` + `connect()` + `signIn()`) | `src/engines/auth/index.ts`, `src/engines/auth/live.ts` |
| 1.2 | Wire `/connect` page to `authEngine.list()` and `connectAndSignIn()` with real error states | `src/pages/Onboarding.tsx` or new connect page |
| 1.3 | Add `RequireSession` guard component | `src/shell/` or `src/ui/` |
| 1.4 | Add `RequireOnboarded` guard component | `src/shell/` or `src/ui/` |
| 1.5 | Wallet-change sign-out handler | `src/engines/auth/live.ts` or `src/shell/DashboardApp.tsx` |
| 1.6 | Wire Settings identity to real engine data (replace hardcoded values) | `src/pages/SettingsPage.tsx` |
| 1.7 | Onboarding autosave and resume behavior | `src/engines/onboarding/live.ts`, `src/pages/Onboarding.tsx` |
| 1.8 | DB proof scripts (upsert under column grants, onboarded_at REST rejection, row-level isolation) | `scripts/verify-*.mjs` |

### Phase 2: Shared Evaluator Integration

| Task | Description | Files affected |
|---|---|---|
| 2.1 | Wire `evaluationEngine` to use local pure `evaluate()` from `@airlock/shared` (fallback to external API if configured) | `src/engines/evaluation/live.ts` |
| 2.2 | Attack Lab uses local evaluator when API URL unset | `src/pages/AttackLab.tsx` |
| 2.3 | Add `payment_requests` table, `evaluations` table, `paid_today` view to Supabase migration | `supabase/migrations/0004_evaluation.sql` |
| 2.4 | Add RLS policies and column grants for new tables | Same migration |

### Phase 3: In-Progress Modules (build real pages)

| Module | Feature | Pages to build | Files |
|---|---|---|---|
| Payment requests & Activity | `requests` | Activity page, payment request create/list | `src/pages/ActivityPage.tsx`, `src/pages/PaymentRequest.tsx` |
| Approvals | `approvals` | Approvals list/detail | `src/pages/Approvals.tsx` |
| Chain / On-chain settlement | `chain` | Settlement status, transaction history | `src/pages/Settlement.tsx` |
| Dashboard metrics | `metrics` | Real dashboard with metrics | `src/pages/Dashboard.tsx` |

### Phase 4: End-to-End Verification

| Task | Description | Evidence |
|---|---|---|
| 4.1 | Full sign-in → onboarding → registry → evaluation flow with real wallet | Browser + Solflare on devnet |
| 4.2 | Load demo data → verify supplier → create invoice → attest → Attack Lab simulation | Supabase + Attack Lab |
| 4.3 | Run `pnpm -r test` — all package tests pass, baseline not lowered | vitest output |
| 4.4 | `npm run build` and `npx tsc --noEmit` green | Build output |
| 4.5 | Migration `0004_evaluation.sql` dry-run + push to airlock-dev | `supabase migration list --remote` |

---

## 4. TECHNICAL DETAILS BY AREA

### Authentication (`auth` feature = live)

Current: `authEngine` has `connect()`, `signIn()`, `getSession()`, `signOut()`, `list()`, `onChange()`. No `connectAndSignIn()`. No `RequireSession`/`RequireOnboarded` guards. No wallet-change sign-out.

Needed:
- `connectAndSignIn(walletName): Promise<AuthSession>` — calls `connect()` then `signIn()`, returns unified session
- `RequireSession` component — redirects to connect if no session
- `RequireOnboarded` component — redirects to onboarding if not onboarded
- Wallet change listener — signs out on wallet switch/disconnect

### Onboarding (`onboarding` feature = live)

Current: `onboardingEngine` has `get()`, `saveStep()`, `complete()`. No autosave. No resume.

Needed:
- Autosave on each step change (debounced `saveStep()`)
- Resume from last saved step on return
- `onboarded_at` column in organizations table (migration)

### Registry (`registry` feature = live)

Current: Complete. Suppliers, agents, policies, invoices CRUD + verify/attest/dispute RPCs. `load_demo_data()` RPC. Views: `supplier_summary`, `agent_summary`.

Needed: Nothing — Phase 1 complete.

### Evaluation (`evaluation` feature = live)

Current: `evaluationEngine` calls external API (`VITE_EVALUATION_API_URL`). `evaluate()` pure function exists in `packages/shared` but not wired. Attack Lab uses engine (throws if API URL unset).

Needed:
- Wire `evaluate()` into `LiveEvaluationEngine.evaluateRequest()` (local first, API fallback)
- `payment_requests` table, `evaluations` table, `paid_today` view
- `0004_evaluation.sql` migration

### Requests (`requests` feature = in_progress)

Current: `ActivityPage.tsx` exists but is gated behind FeatureGate. Uses positional `string[][]` rows (violates type safety rule).

Needed:
- Real payment request engine (`src/engines/requests/`)
- Payment request table with proper types
- Activity page wired to real engine

### Approvals (`approvals` feature = in_progress)

Current: Nothing built. Gated behind FeatureGate.

Needed:
- Approvals engine, table, pages

### Chain (`chain` feature = in_progress)

Current: Nothing built. Gated behind FeatureGate. `SOLANA.md` must be read before any Anchor/Rust work.

Needed:
- Read `SOLANA.md` in full
- On-chain program (Anchor), USDC SPL integration, devnet
- LiteSVM CU budget benchmarks (`docs/cu-budget.md`)

### Metrics (`metrics` feature = in_progress)

Current: Dashboard is gated behind FeatureGate. WelcomePanel only.

Needed:
- Real metrics from Supabase (views, RPCs)
- Dashboard page with live data

---

## 5. MIGRATION PLAN

| Migration | Description | Status |
|---|---|---|
| `0001` | Organizations, users, base auth | Applied |
| `0002` | Base tables (organizations, etc.) | Applied |
| `0003` | Registry (suppliers, agents, policies, invoices + RPCs + views) | Applied |
| `0004` | Evaluation (payment_requests, evaluations, paid_today view) | Not started |
| `0005` | Onboarding (onboarded_at on organizations) | Not started |
| `0006` | Requests (payment_requests) | Not started |
| `0007` | Approvals | Not started |

Migration rules (from AGENTS.md):
- Always `supabase db push --remote=tjzavfhghbjxchohkimo --dry-run` first
- Then `--yes` for new migrations only
- Never reset, drop, truncate, or edit applied migrations
- Migration push fails twice → stop module, log blocker

---

## 6. TESTING STRATEGY

| Layer | Tool | Baseline | Status |
|---|---|---|---|
| Root vitest | `npx vitest run` | 40 tests | Passing |
| packages/shared | `pnpm -r test` (shared) | ~81 tests | Passing (92 with evaluate) |
| packages/golden | `pnpm -r test` (golden) | 4 tests | Passing |
| pgTAP (Supabase) | `supabase test db --remote` | Not set up | Not started |
| E2E | Browser + wallet | Not set up | Not started |

`.test-baseline` = 40 (root). Never lower below current count unless deleting tests whose sole subject was deleted code.

---

## 7. NEEDS ELIKEM (Owner decisions / browser / wallet)

1. **Browser + wallet:** Sign-in flow with Solflare on devnet, `/connect` wiring, wallet-change sign-out testing
2. **Decision:** Whether `evaluate()` should be the primary evaluation path (local) vs. external API
3. **Decision:** Whether to build `RequireSession`/`RequireOnboarded` guards now or later
4. **Decision:** Whether to create `payment_requests`/`evaluations` tables and `paid_today` view (Phase 2)
5. **Credentials:** `.env.local` with real Supabase anon key, URL, `VITE_EVALUATION_API_URL`, `VITE_POLICY_API_URL`
6. **Decision:** On-chain program scope (read `SOLANA.md` before any Anchor work)

---

## 7. EXACT COMMANDS FOR DEV-ONLY VERIFICATION

```powershell
# Typecheck (from src/)
cd src
npx tsc --noEmit

# Build (from root)
cd ..
npm run build

# Root tests
npx vitest run

# All package tests
pnpm -r test

# Migration list on airlock-dev
npx supabase migration list --remote=tjzavfhghbjxchohkimo

# Dry-run a new migration (NEW migrations only)
npx supabase db push --remote=tjzavfhghbjxchohkimo --dry-run --yes

# Push a new migration
npx supabase db push --remote=tjzavfhghbjxchohkimo --yes

# Regenerate CSS usage report
node scripts/css-usage.mjs
```

---

## 8. ORDER OF OPERATIONS (Recommended)

1. Fix baseline notes (done) → commit → push
2. Create `connectAndSignIn()` + wire `/connect` → commit → push
3. Add `RequireSession` / `RequireOnboarded` guards → commit → push
4. Wire Settings identity to real data → commit → push
5. Wire `evaluate()` into evaluation engine → commit → push
6. Create `0004_evaluation.sql` migration → dry-run → push → commit → push
7. Build Activity page (requests) → commit → push
8. Build Approvals page → commit → push
9. Build Dashboard metrics → commit → push
10. Chain module (after reading SOLANA.md) → commit → push
11. Full E2E verification with real wallet → done

---
