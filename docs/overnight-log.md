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

## PART 4: UI Polish — Dashboard, Sidebar, Navbar cleanup (0d3230c)
- src/shell/Sidebar.tsx: tighten vertical rhythm — reduce `.side-brand` height 72→64px, `.sidebar nav` padding 8→4px, `.nav-section` margin-bottom 22→14px, button height 39→34px, `.nav-label` padding 7→5px, `.sidebar-footer` padding 12→8px
- src/index.css: add `.logout-btn`/.notification-header/.mark-read/.notification-panel styles; scope `.due-list`/`.events-list` grid to exclude `.empty-state`; add `.decision-pills` button group; add `.search-clear`; add `.search-panel`/`.global-tag` styles
- src/shell/Topbar.tsx: remove Help icon; replace wallet-profile badge + Log out text button with single LogOut icon button (title="Log out", red hover); add outside-click (mousedown) + Escape handlers; redesign notifications popover (right-aligned, crisp borders/shadow, "Mark all as read" header, empty state with bell icon); add real-time search with decision pills, clear button, "No results found" empty state, keyboard navigation (ArrowDown/ArrowUp/Enter); results grouped by label/group with tag, anchor beneath input, z-index 50
- src/pages/Dashboard.tsx: render real Dashboard layout (`welcome-row`, `metrics-grid`, `TransactionTable`, security panel, due-soon with empty state, events panel with empty state); replace FeatureGate+WelcomePanel; strip all hardcoded mock data (`€184,620`→`--`, `12`→`0`, `142`→`0`, `127/89%`→`0`, `All 7 policies`→`No policies configured`, fake events array→derived from activityRows, `Good morning, Maya`→`Dashboard`, `MONDAY, MAY 19`→empty); live-search filter via decision pills + live search input combine in real time; empty lists show clean empty-state messages; action links use navigate('/app/...') paths; Metric cards at `0` or `--` without hardcoded sample data
- Verified by running: tsc --noEmit (clean), vitest run (8 files / 46 tests pass), vite build (succeeds)
- Needs Elikem: none
