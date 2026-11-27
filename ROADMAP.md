# Airlock App — End-to-End Roadmap

**Goal:** Make the platform fully functional and ready for real-time, end-to-end use.  
**Current state:** Steps 1–5 complete (AGENTS.md decisions, db-truth, hardcoded-data inventory, fake data removal, per-package test floor).  
**Branch:** `foundation`  
**Date:** 2026-11-27

---

## 1. EXECUTIVE SUMMARY

The app has a real Supabase backend with RLS, live engines for registry (suppliers, agents, policies, invoices) and evaluation (Attack Lab via local `evaluate()`), and a strict no-mock-data policy. Remaining work follows the slice order below.

---

## 2. SLICE ORDER (implementation sequence)

| Slice | Description | Feature gate | Status |
|---|---|---|---|
| **1. Login and onboarding** | `connectAndSignIn()`, `RequireSession`, `RequireOnboarded`, wallet-change sign-out, onboarding autosave/resume, Settings identity wiring | `auth` (live), `onboarding` (live) | Not started |
| **2. Registry incl. Policies** | Policies page gated behind `policies` feature, hard-coded data sweep complete | `registry` (live), `policies` (in_progress) | Partially done (registry live, policies gated) |
| **3. Evaluation and Attack Lab** | Wire local `evaluate()` into `evaluationEngine`, remove external API dependency | `evaluation` (live) | Partially done (evaluate() written, not wired) |
| **4. Requests and Activity** | Real payment request engine, Activity page wired to real data | `requests` (in_progress) | Not started |
| **5. On-chain program** | Anchor program, USDC SPL devnet, LiteSVM CU benchmarks (read SOLANA.md first) | `chain` (in_progress) | Not started |
| **6. Chain, approvals and payments** | Approvals engine/pages, payment execution, settlement | `approvals` (in_progress), `chain` (in_progress) | Not started |
| **7. Dashboard** | Real metrics from Supabase views/RPCs | `metrics` (in_progress) | Not started |
| **8. Test harness** | pgTAP against scratch project, verify scripts per slice, E2E verification | n/a | Partially done (vitest floor done) |
| **9. Landing, deploy, README** | Landing page polish, deploy config, README | n/a | Not started |

---

## 3. WHAT'S DONE (Steps 1–5)

| Step | What | Commit | Evidence |
|---|---|---|---|
| Step 1 | AGENTS.md: DECISIONS (final) + SLICE CONTRACT + AUTONOMY | `38a2b7f` | DECISIONS: hard-coded data = mock, evaluation is LOCAL, build items, no external API credentials |
| Step 2 | docs/db-truth.md: all 6 tables, 2 views, 6 functions, 8 triggers, 16 RLS policies PRESENT; `onboarded_at` PRESENT and correctly grant-restricted | — | Migration files + `migration list --remote` (0001, 0002, 0003 all applied) |
| Step 3 | docs/hardcoded-data-inventory.md: 46 REPLACE, 7 DELETE, 5 KEEP hits; 4 dead engines (VITE_*_API_URL) | — | Full file/line inventory |
| Step 4 | `policies` added to FEATURES (in_progress); Policies route gated with `policies`; SettingsPage hard-coded sections → InProgress; Onboarding setTimeout removed; Topbar hard-coded values → "—" | `e46b9eb` | Typecheck passes, build passes, vitest 40 passed |
| Step 5 | scripts/test.sh: per-package baselines (root:40, shared:92, golden:5, pgtap:0); packages/shared/test script added; per-package floor checks | `6aed378` | Root 40 + shared 92 + golden 5 = 137 total |

Current `FEATURES` map:
- auth: live, onboarding: live, registry: live, evaluation: live
- requests: in_progress, policies: in_progress, approvals: in_progress, chain: in_progress, metrics: in_progress

---

## 4. MIGRATION PLAN

| Migration | Description | Status |
|---|---|---|
| `0001` | Organizations, users, base auth (incl. `onboarded_at`) | Applied |
| `0002` | RLS policies on organizations | Applied |
| `0003` | Registry (suppliers, agents, policies, invoices + RPCs + views) | Applied |
| `0004` | Evaluation (`payment_requests`, `evaluations`, `paid_today` view) — ONE migration | Not started |

**Note:** `payment_requests` appears only in migration `0004` (not duplicated). Per AGENTS.md: `payment_requests`, `evaluations` and `paid_today` objects (ONE migration, not two).

Migration rules (from AGENTS.md):
- Always `supabase db push --remote=tjzavfhghbjxchohkimo --dry-run` first
- Then `--yes` for new migrations only
- Never reset, drop, truncate, or edit applied migrations
- Migration push fails twice → stop module, log blocker
- Never touch the `airlock-test` project

---

## 5. TESTING STRATEGY

| Layer | Tool | Baseline | Status |
|---|---|---|---|
| Root vitest | `pnpm test` | 40 tests | Passing |
| packages/shared | `pnpm -r test` (shared) | 92 tests | Passing |
| packages/golden | `pnpm -r test` (golden) | 5 tests | Passing |
| pgTAP (Supabase) | `supabase test db --remote=<scratch>` | 0 tests | Not set up locally |
| E2E | Browser + wallet | Not set up | Not started |

`.test-baseline` tracks per-package counts: rootTestsBaseline=40, sharedTestsBaseline=92, goldenTestsBaseline=5, pgtapTestsBaseline=0. Never delete or skip a test.

---

## 6. NEEDS ELIKEM (Owner decisions / browser / wallet)

1. **Browser + wallet:** Sign-in flow with Solflare on devnet, `/connect` wiring, wallet-change sign-out testing
2. **Decision:** Whether `evaluate()` should be the primary evaluation path (local) vs. external API (per AGENTS.md DECISIONS #2: local is the one path)
3. **Decision:** Whether to build `RequireSession`/`RequireOnboarded` guards now or later
4. **Credentials:** `.env.local` with real Supabase anon key, URL
5. **Decision:** On-chain program scope (read `SOLANA.md` before any Anchor work)

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

# All package tests (root + shared + golden)
pnpm -r test

# Full test harness (per-package floor checks)
./scripts/test.sh

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

1. Slice 1: Login and onboarding (`connectAndSignIn()`, guards, wallet sign-out, autosave/resume) → commit → push
2. Slice 2: Registry incl. Policies (Policies page, hard-coded data sweep) → commit → push
3. Slice 3: Evaluation and Attack Lab (wire local `evaluate()` into engine) → commit → push
4. Slice 4: Requests and Activity (payment request engine, Activity page) → commit → push
5. Slice 5: On-chain program (read SOLANA.md first, Anchor, USDC SPL, CU benchmarks) → commit → push
6. Slice 6: Chain, approvals and payments (approvals engine/pages, settlement) → commit → push
7. Slice 7: Dashboard (real metrics) → commit → push
8. Slice 8: Test harness (pgTAP, verify scripts, E2E) → commit → push
9. Slice 9: Landing, deploy, README → commit → push

---
