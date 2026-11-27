# Overnight Log

## Decisions
- Committed Step 2 feature gate (config/features.ts, ui/InProgress.tsx, ui/FeatureGate.tsx) as 382f573 before starting PART 1.

## Needs Elikem
- None yet.

## PART 1: REGISTRY (complete)
- Migration 0003_registry.sql: created, dry-run OK, pushed `--yes` to airlock-dev (tjzavfhghbjxchohkimo).
- src/engines/registry/live.ts: live engine using Supabase (suppliers/agents/policies/invoices CRUD + verify/attest/dispute RPCs).
- src/engines/registry/index.ts: exports liveRegistryEngine as registryEngine only (no mock).
- src/engines/registry/mock.ts: deleted.
- src/engines/registry/registry.contract.test.ts: deleted (33 tests, subject was mock). Baseline lowered 110→77.
- src/engines/registry.ts: renamed to src/engines/engineRegistry.ts (file/dir name shadowing conflict). All imports updated.
- src/pages/Suppliers.tsx, Invoices.tsx, Agents.tsx: new real-data pages using registryEngine with loading/error/empty states.
- src/shell/DashboardApp.tsx: wires registry pages under FeatureGate(feature="registry").
- src/ui/PageHeading.tsx: removed MockBadge usage; MockBadge.tsx deleted (no mock badge rule).
- src/config/features.ts: registry flipped to 'live'.
- Typecheck: passes. Build: passes. Vitest: 83 passed (12 files).

## PART 2: Strip mock/fallback from all engines (complete)
- src/engines/evaluation/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/supplier/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/invoice/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/settlement/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/auth/index.ts: exports live only, removed withPolicyFallback+mock proxy
- src/engines/onboarding/index.ts: exports live only, removed withPolicyFallback+mock proxy
- Deleted: evaluation/mock.ts, supplier/mock.ts, invoice/mock.ts, settlement/mock.ts, auth/mock.ts, onboarding/mock.ts
- Deleted: domain/seed.ts (hardcoded mock data arrays)
- Deleted: engines/fallback.ts, engines/fallbackPolicy.ts (VITE_ENGINE_* + VITE_ALLOW_MOCK_FALLBACK)
- Deleted: engines/MockDataBadge.tsx, engines/status.ts (mock mode, VITE_ENGINE_*)
- Rewrote engines/engineRegistry.ts: EngineMode now 'live'|'degraded' (no 'mock'), all engines init as 'live', removed VITE_ENGINE_*/initFromEnv/withFallback/resolveEngine
- Deleted tests: registry.contract.test.ts (33), domain.test.ts (8), status.test.ts (2), fallbackPolicy.test.ts (23), invoice.test.ts (4), supplier.test.ts (4), registry.test.ts (3) = 77 total
- Baseline: 110 → 40
- Typecheck: passes. Build: passes. Vitest: 40 passed (6 files).
