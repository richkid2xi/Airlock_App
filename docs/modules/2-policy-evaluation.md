# Module 2: Policy & Evaluation Engine

## Summary
Replaced simulated Attack Lab scenarios and static policy storage with the typed Evaluation & Policy engine architecture (`src/engines/evaluation/`). Implemented deterministic rule evaluation covering all security boundaries, verified against 10 golden test vectors.

## What Changed
- **Evaluation & Policy Port (`src/engines/evaluation/types.ts`)**:
  - `EvaluationEnginePort.evaluateRequest(input)`
  - `PolicyEnginePort.listPolicies()`, `getPolicyById()`, `createPolicy()`, `updatePolicy()`, `assignPolicyToAgents()`
- **Core Rule Evaluator (`src/engines/evaluation/rules.ts`)**:
  - Implements the complete multi-layer security evaluation:
    1. Agent authorization and active status verification
    2. Invoice registration, unpaid validation, and dispute detection
    3. Amount integrity check: requested amount cannot exceed registered invoice
    4. Supplier payout destination match and verification status
    5. Agent per-request and daily spending limit compliance
    6. Delivery attestation policy control (routes to `HOLD` if missing)
    7. Supporting evidence policy control (routes to `HOLD` if missing)
    8. Agent intent validation (routes to `HOLD` if missing/mismatched)
    9. Two-person approval threshold enforcement
- **Golden Vector Parity (`packages/golden/evaluationVectors.ts`, `src/engines/evaluation/evaluation.test.ts`)**:
  - All 10 golden vectors (GV-001 through GV-010) run directly through `evaluatePaymentRules` in CI.
- **Attack Lab Integration in `src/App.tsx`**:
  - Attack Lab simulation triggers the real `evaluationEngine.evaluateRequest()`.
  - Added `<MockDataBadge engine="evaluation" />` and `<MockDataBadge engine="policy" />` without modifying frozen CSS or layouts.
- **Test Baseline**:
  - Baseline test count elevated to 28 passing tests.

## Environment Variables
- `VITE_ENGINE_POLICY=mock|live`
- `VITE_ENGINE_EVALUATION=mock|live`
- `VITE_POLICY_API_URL`: Optional live policy service
- `VITE_EVALUATION_API_URL`: Optional live evaluation service

## How to Test
```bash
# Run tests and verify baseline test count >= 28
powershell -ExecutionPolicy Bypass -File ./scripts/test.ps1

# Run TypeScript type check
npx tsc --noEmit

# Run production build
pnpm run build
```

## Known Gaps
- Module 3 will introduce Solana Devnet wallet connection (`@solana/wallet-adapter-react`), USDC devnet mint validation, and on-chain Anchor settlement execution.
