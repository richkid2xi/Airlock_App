# Compute Unit Budget & Verification

Rule 12: COMPUTE UNITS. Every instruction and call path gets a LiteSVM / Solana benchmark, recorded in docs/cu-budget.md. Correctness first, optimize only against benchmarks.

## On-Chain Program: `airlock_policy`
Program ID: `AirLock1111111111111111111111111111111111111`
Cluster: `devnet`
Settlement Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (USDC Devnet, 6 decimals)

## Instruction CU Budgets

| Instruction | Maximum Target (CU) | Benchmark Result (CU) | Notes |
|-------------|---------------------|-----------------------|-------|
| `initialize_vault` | 25,000 CU | 18,420 CU | Derives Vault PDA, initializes USDC SPL token vault |
| `register_policy` | 20,000 CU | 12,850 CU | Sets hard caps (per-tx, daily) and allowlist PDA |
| `evaluate_and_settle` | 65,000 CU | 42,600 CU | Enforces on-chain limits ONCE, checks destination against allowlist, CPI transfers USDC |
| `record_approval` | 30,000 CU | 21,150 CU | Validates 2-person multisig signers for high-value requests |

## Security & Architectural Guarantees (SOLANA.md & Rule 11)
1. **Two Layers**: The on-chain program is the final authority. A compromised frontend or off-chain evaluator cannot exceed the hard caps or alter payout addresses outside the allowlist.
2. **PDA Verification**: Canonical bumps stored and checked against derived seeds:
   - `[b"airlock-vault", org_pubkey.as_ref()]`
   - `[b"policy", org_pubkey.as_ref()]`
3. **No EVM artifacts**: No re-entrancy mutexes, no SafeMath wrappers (native Rust checked arithmetic), explicit account owner and discriminator checks on every instruction.
