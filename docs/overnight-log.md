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

## PART 3: Evaluation engine live (complete)
- src/pages/AttackLab.tsx: rewritten to fetch real suppliers/agents/invoices from registryEngine, map to domain types, call evaluationEngine.evaluateRequest(); removed positional string[] props and domain adapters
- src/shell/DashboardApp.tsx: Attack Lab renders AttackLab under FeatureGate(feature="evaluation")
- src/config/features.ts: evaluation flipped to 'live'
- Typecheck: passes. Build: passes. Vitest: 40 passed (6 files).

## UI Polish: Topbar + Sidebar + Dashboard cleanup (c3f4d41)
- src/shell/Topbar.tsx: remove Help icon; replace wallet-profile badge + Log out text button with single LogOut icon button (title="Log out", hover red); add outside-click (mousedown) + Escape handlers; redesign notifications popover (right-aligned, crisp borders/shadow, "Mark all as read" header, empty state with bell icon)
- src/index.css: hide nav scrollbar while keeping overflow-y:auto (scrollbar-width:none, -ms-overflow-style:none, ::-webkit-scrollbar display:none); add .logout-btn styles; add .notification-header/.mark-read/.notification-panel ul/li styles
- src/shell/Sidebar.tsx: remove .environment "Protection active / All systems operational" card from .sidebar-footer; keep .profile-card wallet selector
- src/shell/DashboardApp.tsx: replace FeatureGate(feature="metrics") + WelcomePanel with real Dashboard layout; remove WelcomePanel function and unused imports (Status, FeatureGate, orgName lookup); render Dashboard for /app, real pages for others
- src/pages/Dashboard.tsx: strip all hardcoded mock data — `€184,620`→`--`, `12`→`0`, `approvalCount` default 3→0, `142 requests`→`0`, `127 89%/9 6%/6 4%`→`0 0%`, `All 7 policies`→`No policies configured`, hardcoded security events array→filter from activityRows, `Good morning, Maya`→`Dashboard`, `MONDAY, MAY 19`→empty
- Verified by running: tsc --noEmit (clean), vitest run (8 files / 46 tests pass), vite build (succeeds)
- Needs Elikem: none
