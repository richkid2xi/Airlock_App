# Module 2: Policy & Evaluation Engine

## Summary
Replaced simulated Attack Lab scenarios and static policy storage with the typed Evaluation engine architecture (`src/engines/evaluation/`). Implemented deterministic local rule evaluation covering all security boundaries, verified against golden test vectors.

## What Changed
- **Evaluation Port (`src/engines/evaluation/types.ts`)**:
  - `EvaluationEnginePort.evaluateRequest(input): Promise<Evaluation>`
- **Live Engine (`src/engines/evaluation/live.ts`)**:
  - Calls `evaluatePaymentRules` from `rules.ts` directly — no external `VITE_EVALUATION_API_URL` dependency
  - Policy engine methods removed (live via Supabase registry engine instead)
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
- **Pure Evaluator (`packages/shared/src/evaluateRequest.ts`)**:
  - `evaluatePaymentRequest(input): EvaluatePaymentRequestOutput` — the single source of truth for evaluation logic
  - Bigint money math, `now` input for determinism, full rule breakdown + snapshot
- **Golden Vector Parity (`packages/golden/evaluationVectors.ts`, `src/engines/evaluation/evaluation.test.ts`)**:
  - GV-001 through GV-010 run directly through `evaluatePaymentRules`
  - GV-011 through GV-030 defined in new `PaymentEvaluationVector` shape for `evaluatePaymentRequest`
- **Attack Lab Integration (`src/pages/AttackLab.tsx`)**:
  - Attack Lab simulation triggers `evaluationEngine.evaluateRequest()` via live engine

## Environment Variables
None required for evaluation — it is fully local. No `VITE_EVALUATION_API_URL` needed.

## How to Test
```bash
# Run all tests (includes evaluator + golden vectors)
npx vitest run

# Run TypeScript type check
npx tsc --noEmit

# Run production build
npx vite build

# Run evaluation verification script
npx tsx scripts/verify/evaluation.ts
```

## Known Gaps
- Module 3 will introduce Solana Devnet wallet connection (`@solana/wallet-adapter-react`), USDC devnet mint validation, and on-chain Anchor settlement execution.
- Policy management (create/edit/assign) is served through the registry engine via Supabase; external `VITE_POLICY_API_URL` is not used.
