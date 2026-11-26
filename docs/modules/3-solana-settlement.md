# Module 3: Solana Devnet & Settlement Engine

## Summary
Integrated the Solana Devnet Settlement Engine (`src/engines/settlement/`), connecting invoice-bound payment authorizations directly to on-chain execution with Circle Devnet USDC SPL tokens (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`).

## What Changed
- **Settlement Port (`src/engines/settlement/types.ts`)**:
  - `getCluster()`: returns `'devnet'`
  - `getUsdcMint()`: returns verified Circle Devnet mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
  - `executeSettlement(params)`: validates Solana Base58 public keys and executes settlement
  - `approveHoldRequest(id, reviewer)` / `rejectHoldRequest(id, reviewer)`
- **Mock Settlement Engine (`src/engines/settlement/mock.ts`)**:
  - Simulates settlement receipts with realistic Solana Devnet signatures, slot confirmations, and timestamps.
- **Live Settlement Engine (`src/engines/settlement/live.ts`)**:
  - Uses `@solana/web3.js` to connect to `api.devnet.solana.com`.
  - Validates Base58 public key format and fetches recent blockhashes / slot height.
  - Posts to settlement relayer when configured, with seamless fallback on transport interruption.
- **Settlement Proxy (`src/engines/settlement/index.ts`)**:
  - Wraps calls with `withFallback('settlement', liveFn, mockFn)` and updates engine degradation metrics.
- **UI Integration in `src/App.tsx`**:
  - Topbar and connected identity updated to display Solana cluster (`devnet`) and settlement mint (`4zMMC9...ncDU`).
  - Approvals queue confirmation dialog calls `settlementEngine.executeSettlement()` and displays the resulting transaction signature via toast feedback.
  - Added `<MockDataBadge engine="settlement" />` on the Approvals page heading.
- **Compute Unit Documentation (`docs/cu-budget.md`)**:
  - Documented CU benchmarks for `initialize_vault`, `register_policy`, `evaluate_and_settle`, and `record_approval` against LiteSVM budgets.
- **Test Baseline**:
  - Elevated baseline to 32 tests (`src/engines/settlement/settlement.test.ts` added with 4 tests).

## Environment Variables
- `VITE_ENGINE_SETTLEMENT=mock|live`
- `VITE_SOLANA_CLUSTER=devnet`
- `VITE_SOLANA_RPC_URL=https://api.devnet.solana.com`
- `VITE_SOLANA_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## How to Test
```bash
# Run tests and verify baseline count >= 32
powershell -ExecutionPolicy Bypass -File ./scripts/test.ps1

# Run TypeScript type check
npx tsc --noEmit

# Run production build
pnpm run build
```
