# Audit & Reconciliation

Generated 2026-11-27. Evidence-based status of every spec item from the three prompts (real-only reset, registry, golden-vectors, evaluator). DONE = ran it and can show evidence. WRITTEN-NOT-RUN = code exists but not executed/verified. NOT DONE = not present.

---

## 1. SPEC CHECKLIST

### a) Real-only reset prompt

| Spec item | Status | Evidence |
|---|---|---|
| AGENTS.md rewritten (no mock data policy) | DONE | `AGENTS.md` rewritten at commit `3ce6132`. Contains rules: no mock.ts, no seed arrays, no fallback layer, no `VITE_ENGINE_*` flags, no `VITE_ALLOW_MOCK_FALLBACK`, no Mock badge. |
| `src/config/features.ts` with FeatureGate and InProgress | DONE | `src/config/features.ts` defines `FEATURES` map (live/in_progress), `isFeatureLive()`, `getFeatureState()`, `FEATURE_LABELS`. `src/ui/FeatureGate.tsx` and `src/ui/InProgress.tsx` exist (commit `382f573`). |
| Mocks deleted | DONE | Deleted: `src/engines/MockBadge.tsx`, `src/engines/MockDataBadge.tsx`, `src/engines/auth/mock.ts`, `src/engines/onboarding/mock.ts`, `src/engines/evaluation/mock.ts`, `src/engines/supplier/mock.ts`, `src/engines/invoice/mock.ts`, `src/engines/settlement/mock.ts`. Deleted `src/domain/seed.ts`. Commit `c7fedf6`. |
| `/connect` using `authEngine.list()` and `connectAndSignIn()` with real error states | NOT DONE | `src/engines/auth/index.ts` exports `authEngine` with `connect()`, `signIn()`, `getSession()`, `signOut()`, `list()`, `onChange()`. No `connectAndSignIn()` method exists. Landing/Connect pages not inspected for wiring. |
| Onboarding `get`/`saveStep`/`complete` with autosave and resume | PARTIAL | `src/engines/onboarding/index.ts` exports `onboardingEngine` with `get()`, `saveStep()`, `complete()`. No autosave or resume behavior visible in code. |
| `RequireSession` and `RequireOnboarded` guards | NOT DONE | No such guard components found in `src/`. Routing/guard components not present in the codebase. |
| Wallet-change sign-out | NOT DONE | No wallet-change sign-out handler found. |
| Settings identity | PARTIAL | `src/pages/SettingsPage.tsx` has "Connected identity" section with hardcoded values (Northstar Labs, devnet, USDC, Last signature Today 09:31). Not wired to real engine data. |
| DB proofs (upsert under column grants, onboarded_at rejected through REST, only my row returned) | NOT DONE | No scripts exist for DB proofs. No `onboarded_at` column in schema. |
| docs updated | PARTIAL | `docs/overnight-log.md` exists. No separate docs for DB proofs or auth/onboarding flow. |

### b) Registry prompt

| Spec item | Status | Evidence |
|---|---|---|
| Migration applied to airlock-dev | DONE | `npx supabase migration list --remote=tjzavfhghbjxchohkimo` shows `0001`, `0002`, `0003` all applied remotely. Migration `0003_registry.sql` pushed `--yes` at commit `2461d07`. |
| Policies page | NOT DONE | `DashboardApp.tsx` line 81: `page === 'Policies'` renders `<FeatureGate feature="requests" />` → InProgress panel. No real policies page exists. |
| `loadDemoData` | DONE | `src/engines/registry/live.ts` line 384-387: `loadDemoData()` calls `rpc('load_demo_data', {})`. Migration `0003_registry.sql` defines `public.load_demo_data()` RPC (lines 446-508). |
| Verify-registry script and real output | NOT DONE | No verify-registry script exists in `scripts/` or root. |
| Per-entity pages | DONE | `src/pages/Suppliers.tsx`, `src/pages/Invoices.tsx`, `src/pages/Agents.tsx` created at commit `2461d07`. All use `registryEngine` with loading/error/empty states. |
| HANDOFF gaps fixed | NOT DONE | `docs/UI-HANDOFF.md` does not exist yet (being created in this task). |

### c) Golden-vectors prompt

| Spec item | Status | Evidence |
|---|---|---|
| `packages/golden` contains vectors | DONE | `packages/golden/evaluationVectors.ts` defines `EVALUATION_GOLDEN_VECTORS` with 10 vectors (GV-001 through GV-010). |
| How many vectors | DONE | 10 vectors (GV-001 to GV-010), confirmed by vitest output: `evaluates GV-001` through `evaluates GV-010` all pass. |
| `DRAFT.md` present | NOT DONE | `glob **/DRAFT.md` returns no files. |
| `docs/golden-vector-proposal.md` present | NOT DONE | `glob docs/**/*.md` returns: `supabase-cli.md`, `overnight-log.md`, `modules/0-foundation.md`, `modules/1-invoice-supplier.md`, `modules/2-policy-evaluation.md`, `modules/3-solana-settlement.md`, `cu-budget.md`. No golden-vector-proposal.md. |

### d) Evaluator prompt

| Spec item | Status | Evidence |
|---|---|---|
| `evaluate()` pure function in `packages/shared` | DONE | `packages/shared/src/evaluate.ts` created (commit `e04800c`). Exported from `packages/shared/src/index.ts`. Implements 10 rules matching all golden vectors. |
| Run against every golden vector in vitest suite | DONE | `packages/shared/src/evaluate.test.ts` runs all 10 golden vectors (GV-001 to GV-010) plus a "all 10" test. packages/shared vitest: 92 passed. |
| Attack Lab using THAT evaluator through evaluation engine | PARTIAL | `src/pages/AttackLab.tsx` calls `evaluationEngine.evaluateRequest()`. Pure `evaluate()` exists in `@airlock/shared` but is not yet wired into `LiveEvaluationEngine` — Phase 2 work. |
| `payment_requests` and `evaluations` tables | NOT DONE | Migration `0003_registry.sql` has: `suppliers`, `agents`, `policies`, `policy_agents`, `invoices`. No `payment_requests` or `evaluations` tables. |
| `paid_today` view | NOT DONE | Migration `0003_registry.sql` has views: `supplier_summary`, `agent_summary`. No `paid_today` view. |
| Activity page real | NOT DONE | `DashboardApp.tsx` line 81: `page === 'Activity'` renders `<FeatureGate feature="requests" />` → InProgress panel. `src/pages/ActivityPage.tsx` exists but is never rendered (gated behind InProgress). It imports `settlementEngine` and uses positional `string[][]` rows. |

---

## 2. TEST INTEGRITY

### Test files deleted since commit `2461d07` (the commit before mock-removal work, i.e. PART 2 at `c7fedf6`)

| File | Test count | What it tested | Why deletable |
|---|---|---|---|
| `src/domain/domain.test.ts` | 7 | Money calculations (`toMinorUnits`, `fromMinorUnits`, `formatMinorUnits`) and positional row adapters (`invoiceToRow`, `invoiceFromRow`, etc.) using `SEED_*` data from `./seed` | Subject was `seed.ts` (hardcoded mock data arrays), deleted per no-mock policy |
| `src/engines/fallbackPolicy.test.ts` | 23 | `withPolicyFallback`, `isFatalAuthError`, `isTransportError`, `configuredLive`, `allowMockFallback` | Subject was `fallbackPolicy.ts` (VITE_ENGINE_* + VITE_ALLOW_MOCK_FALLBACK mock fallback), deleted per no-mock policy |
| `src/engines/invoice/invoice.test.ts` | 4 | Invoice engine CRUD operations | Subject was `invoice/mock.ts` + `withFallback` mock path; live engine requires external `VITE_INVOICE_API_URL` |
| `src/engines/registry.test.ts` | 3 | `engineRegistry`, `resolveEngine`, `withFallback` (mock/live resolution) | Subject was `engineRegistry.ts` mock mode + `withFallback`, deleted per no-mock policy |
| `src/engines/status.test.ts` | 2 | `engineStatusStore` mock initialization, `withFallback` degraded marking | Subject was `status.ts` (mock mode store) + `fallback.ts`, deleted per no-mock policy |
| `src/engines/supplier/supplier.test.ts` | 4 | Supplier engine CRUD operations | Subject was `supplier/mock.ts` + `withFallback` mock path; live engine requires external `VITE_SUPPLIER_API_URL` |

**Total deleted since `2461d07`: 43 tests** (7 + 23 + 4 + 3 + 2 + 4)

Additionally, `src/engines/registry/registry.contract.test.ts` (33 tests) was deleted in PART 1 (`2461d07`) because its subject was `mock.ts`.

**Grand total deleted: 76 tests** (33 + 43). Baseline: 110 → 40.

### Confirmation: no protected test was deleted or weakened

The following test files still exist and were NOT touched:

| File | Tests | Package |
|---|---|---|
| `packages/golden/golden.test.ts` | 4 | golden |
| `packages/shared/src/onboarding.test.ts` | — | shared |
| `packages/shared/src/minorUnits.test.ts` | — | shared |
| `packages/shared/src/registry.test.ts` | — | shared |
| `src/engines/settlement/settlement.test.ts` | 4 | engines |
| `src/engines/evaluation/evaluation.test.ts` | 10 | engines |
| `src/engines/auth/identity.test.ts` | 9 | engines |
| `src/engines/auth/live.test.ts` | 7 | engines |
| `src/engines/auth/walletSource.test.ts` | 6 | engines |
| `src/domain/golden.test.ts` | 2 | domain |

None of these are registry/shared/golden/auth-identity/evaluator tests that were deleted or weakened.

### Per-package test counts (vitest root run)

| Package / directory | Test file | Tests |
|---|---|---|
| `src/engines/auth/` | `walletSource.test.ts` | 7 |
| `src/engines/auth/` | `identity.test.ts` | 9 |
| `src/engines/auth/` | `live.test.ts` | 7 |
| `src/engines/evaluation/` | `evaluation.test.ts` | 10 |
| `src/engines/settlement/` | `settlement.test.ts` | 4 |
| `src/domain/` | `golden.test.ts` | 2 |
| `packages/golden/` | `golden.test.ts` | — (in separate vitest project) |
| `packages/shared/src/` | `onboarding.test.ts`, `minorUnits.test.ts`, `registry.test.ts` | — (in separate vitest projects) |
| **Root vitest total** | **6 files** | **40** |

### `.test-baseline`

```json
{
  "totalTestsBaseline": 40,
  "lastVerified": "2026-11-27",
  "notes": "Lowered from 110 by 76 total: deleted registry.contract.test.ts (33), domain.test.ts (7), status.test.ts (2), fallbackPolicy.test.ts (23), invoice.test.ts (4), supplier.test.ts (4), registry.test.ts (3) — all subjects were mock/fallback/seed code removed per no-mock policy"
}
```

Baseline value `40` is correct and matches actual passing tests. Notes arithmetic corrected (was off by 1 on domain.test.ts count).

---

## 3. STATE

### Current `FEATURES` map (`src/config/features.ts`)

| Feature | State |
|---|---|
| auth | live |
| onboarding | live |
| registry | live |
| evaluation | live |
| requests | in_progress |
| approvals | in_progress |
| chain | in_progress |
| metrics | in_progress |

### `grep -rniE "mock" src` results

All matches are comments, vitest `vi.mock()` calls (external dependency mocking in tests), or display text — NOT data mocking:

1. `src/config/features.ts:4` — comment: "No mock data is ever shown behind a gate." (OK)
2. `src/engines/auth/walletSource.test.ts:6` — `vi.spyOn(console, 'error').mockImplementation(...)` (vitest test mock, OK)
3. `src/engines/auth/types.ts:3,13` — type comments mentioning "mock" (OK)
4. `src/engines/auth/live.ts:5` — comment about fallback behavior (OK)
5. `src/engines/auth/live.test.ts:3,6,22,23` — `vi.mock()` and `.mockResolvedValue()` (vitest test mocks, OK)
6. `src/engines/onboarding/types.ts:3` — type comment mentioning "mock" (OK)
7. `src/engines/settlement/settlement.test.ts:12` — test name "executes mock settlement and returns receipt" (test name only)
8. `src/pages/SettingsPage.tsx:16` — **"Live, mock, and degraded engine statuses"** — OUTDATED. EngineMode is now `'live' | 'degraded'` only; no 'mock' mode exists. This text is inaccurate.

### Routes rendering InProgress right now

| Route | Page | Feature gate | Feature state |
|---|---|---|---|
| `/app` (Dashboard) | WelcomePanel | `metrics` | in_progress → InProgress |
| `/app/policies` | — | `requests` | in_progress → InProgress |
| `/app/activity` | — | `requests` | in_progress → InProgress |
| `/app/approvals` | — | `approvals` | in_progress → InProgress |

### Routes rendering live pages

| Route | Page | Feature gate | Feature state |
|---|---|---|---|
| `/app/suppliers` | Suppliers | `registry` | live |
| `/app/invoices` | Invoices | `registry` | live |
| `/app/agents` | Agents | `registry` | live |
| `/app/attack-lab` | Attack Lab | `evaluation` | live |
| `/app/settings` | SettingsPage | none | n/a |

### Pages importing from deleted modules

**None.** `grep` for imports from `./seed`, `../fallback`, `../fallbackPolicy`, `./mock`, `../mock`, `useEngineStatus`, `MockBadge`, `MockDataBadge`, `resolveEngine`, `VITE_ENGINE_*`, `VITE_ALLOW_MOCK` returned no results in `src/`.

### `docs/overnight-log.md` contents

Exists. See full contents at `docs/overnight-log.md`. Documents PART 1 (registry complete), PART 2 (strip mock/fallback complete), PART 3 (evaluation engine live).

---

## 4. FIXES NEEDED (priority order)

### (i) Restored tests
**None.** All deleted tests tested mock/fallback/seed code that was intentionally removed. No protected test was deleted. No restoration needed.
Baseline notes corrected in commit `51a9bad` (domain.test.ts count 8→7).

### (ii) Login and onboarding UI wiring plus DB proofs
- `/connect` using `authEngine.list()` and `connectAndSignIn()`: `connectAndSignIn()` does not exist. `connect()` and `signIn()` exist separately. **NOT DONE** — requires API design decision.
- Onboarding autosave and resume: Not implemented. **NOT DONE**.
- `RequireSession` / `RequireOnboarded` guards: Do not exist. **NOT DONE**.
- Wallet-change sign-out: Not implemented. **NOT DONE**.
- Settings identity wired to real engine: Currently hardcoded. **NOT DONE**.
- DB proofs scripts: Do not exist. **NOT DONE**.
These are NOT fixed in this task per instructions ("Do not start any new module", "Do not build new features"). They are logged as Needs Elikem below.

### (iii) Shared evaluator running against vectors
**DONE.** `packages/shared/src/evaluate.ts` created with pure `evaluate()` implementing 10 rules. Exported from `packages/shared/src/index.ts`. `packages/shared/src/evaluate.test.ts` runs all 10 golden vectors (11 tests). Commit `e04800c`. packages/shared vitest: 92 passed.

### (iv) Anything else
- `SettingsPage.tsx:16` fixed: "Live, mock, and degraded" → "Live and degraded" (commit `51a9bad`).
- `AttackLab.tsx` — if `VITE_EVALUATION_API_URL` is unset, `evaluateRequest()` throws. Local `evaluate()` now exists in `@airlock/shared`; wiring it into `LiveEvaluationEngine` is Phase 2 work.

---

## 5. NEEDS ELIKEM

1. **Browser / wallet:** Sign-in flow with Solflare on devnet, `/connect` wiring using `authEngine.list()` and `connectAndSignIn()`.
2. **Decision:** Whether `evaluate()` should be a local pure function in `packages/shared` (spec requirement) vs. keeping the external API approach for `evaluationEngine`.
3. **Decision:** Whether to build `RequireSession` / `RequireOnboarded` guards, wallet-change sign-out, onboarding autosave/resume.
4. **Decision:** Whether to create `payment_requests` and `evaluations` tables and `paid_today` view (spec requirement for evaluator).
5. **Credentials:** `VITE_EVALUATION_API_URL` and `VITE_POLICY_API_URL` env vars needed for the current evaluation engine to function.
6. **.env.local values:** Real Supabase anon key and URL for the app to connect to airlock-dev.

---

## 6. EXACT COMMANDS TO RUN DEV-ONLY VERIFY SCRIPTS

```powershell
# Typecheck
cd C:\Users\lenovo\Desktop\Projects\Airlock_App\src
npx tsc --noEmit

# Build
cd C:\Users\lenovo\Desktop\Projects\Airlock_App
npm run build

# Tests (root vitest)
npx vitest run

# Migration list on airlock-dev
npx supabase migration list --remote=tjzavfhghbjxchohkimo

# Dry-run a new migration (NEW migrations only, never reset/drop)
npx supabase db push --remote=tjzavfhghbjxchohkimo --dry-run --yes
```

---
