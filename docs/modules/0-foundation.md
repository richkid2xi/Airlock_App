# Module 0: Domain Foundation & Engine Architecture

## Summary
Established the typed domain foundation, minor-unit money calculations (USDC 6 decimals), bidirectional positional row adapters, engine degradation and honest fallback store, golden test vectors in `packages/golden`, and the baseline test enforcement harness (`scripts/test.sh`, `scripts/test.ps1`, `.test-baseline`).

## What Changed
- **Domain Types (`src/domain/types.ts`)**: Replaced loose positional string arrays with strongly typed entities: `Invoice`, `Supplier`, `Agent`, `Policy`, `PaymentRequest`, `Evaluation`, and `Approval`. Defined stable ID rules and Solana devnet constants.
- **Money (`src/domain/money.ts`)**: Handled monetary amounts strictly as integer minor units (`bigint`/string). USDC is configured with 6 decimals. Floats are banned in domain calculations and formatting occurs only at the display edge (`formatMinorUnits`, `formatUSDC`).
- **Row Adapters (`src/domain/adapters.ts`)**: Implemented bidirectional `invoiceToRow`/`invoiceFromRow`, `supplierToRow`/`supplierFromRow`, `agentToRow`/`agentFromRow`, and `paymentRequestToRow`/`paymentRequestFromRow` to ensure untouched frontend views remain 100% operational with frozen styling.
- **Seed Data (`src/domain/seed.ts`)**: Migrated baseline mock records into strongly typed models with UUID/stable IDs and integer minor units.
- **Engine Degradation & Fallback (`src/engines/status.ts`, `src/engines/fallback.ts`)**:
  - Implemented `EngineStatusStore` tracking status (`live` | `mock` | `degraded`) per engine (`invoice`, `supplier`, `policy`, `evaluation`, `settlement`).
  - Added `withFallback` wrapping live calls with automatic fallback to mock when `VITE_ALLOW_MOCK_FALLBACK=true`.
  - Added `MockDataBadge` adhering to UI frozen rules and presenting clear badges whenever mock/degraded data is displayed.
- **Golden Vectors (`packages/golden/evaluationVectors.ts`)**: Authored 10 golden evaluation vectors capturing all attack lab and rule test cases prior to implementation (GV-001 through GV-010).
- **Test Baseline Enforcement (`scripts/test.sh`, `scripts/test.ps1`, `.test-baseline`)**: Integrated baseline test count verification ensuring no test count drop.

## Environment Variables
- `VITE_ENGINE_INVOICE`: `mock` | `live` (default: `mock`)
- `VITE_ENGINE_SUPPLIER`: `mock` | `live` (default: `mock`)
- `VITE_ENGINE_POLICY`: `mock` | `live` (default: `mock`)
- `VITE_ENGINE_EVALUATION`: `mock` | `live` (default: `mock`)
- `VITE_ENGINE_SETTLEMENT`: `mock` | `live` (default: `mock`)
- `VITE_ALLOW_MOCK_FALLBACK`: `true` | `false` (default: `true`)
- `VITE_SOLANA_CLUSTER`: `devnet`
- `VITE_SOLANA_RPC_URL`: Solana RPC endpoint
- `VITE_SOLANA_USDC_MINT`: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle devnet USDC mint)

## How to Test
```bash
# Run tests and verify baseline count >= 10
powershell -ExecutionPolicy Bypass -File ./scripts/test.ps1
# or
bash ./scripts/test.sh

# Run TypeScript typecheck
npx tsc --noEmit

# Run production build
pnpm run build
```

## Known Gaps
- Modules 1 through 4 will progressively hook engines (`invoice`, `supplier`, `evaluation`, `settlement`) into `src/engines/` and replace the direct `sessionStorage` mock mutations in `App.tsx`.
