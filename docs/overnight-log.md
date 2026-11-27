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
