# SOLANA.md: read this before writing any Solana or Anchor code

## Runtime model (do not re-derive or "protect" against these)
- Programs are stateless. Only an account's owner program can modify its data or debit its lamports.
- Transactions are atomic: if any instruction fails, the whole transaction reverts. Do not write code to handle partial state.
- Account creation zero-initializes memory. Do not zero it again.
- Re-entrancy through CPI into another program is not possible on Solana (only direct self-invocation). Do NOT add re-entrancy guards or mutex flags.
- Rust integer overflow: use checked arithmetic where values come from untrusted input. Do not write Solidity-style SafeMath wrappers around everything, and do not write code to guard total lamport supply overflow.
- Floating point is deterministic on Solana (software emulation). It is slow in compute units, so avoid it in hot paths, but it is not a consensus risk.
- The runtime is parallel: transactions declare their accounts upfront. Keep account lists minimal and mark accounts read-only when possible.

## Validation (do this explicitly, every instruction)
- Check account owners explicitly. Do not rely only on the runtime.
- Check signers, writable flags, account uniqueness (no duplicate account abuse), mint matches, delegations/delegates on token accounts, account sizes, and discriminators.
- Verify PDAs by re-deriving seeds and bump; store the canonical bump.
- For CPIs: understand how signer and writable privileges propagate to the callee. Never pass a signer privilege to a program you have not allowlisted.
- Close accounts safely: zero data, set closed discriminator, transfer lamports, and prevent revival within the same transaction.
- Validate instruction sysvar / native program (e.g. ed25519) offsets if used.

## Airlock-specific security rules
- The vault PDA can only be moved by the airlock-policy program.
- Hard caps (per-tx, daily) and the destination/program allowlists are enforced ONCE ONLY in the program; the off-chain engine is a second layer, never the only layer.
- A compromised engine must never be able to exceed on-chain limits.
- Blocked actions (SetAuthority, Approve/delegate, CloseAccount on vault token accounts) are rejected on-chain.

## Process rules
- Test first. Define golden vectors in packages/golden BEFORE writing logic.
- Every instruction and every call path has a test and a CU benchmark.
- Never delete, comment out, or skip tests. scripts/test.sh fails if the test count drops.
- Measure compute units with LiteSVM benchmarks; record in docs/cu-budget.md. Correct but bloated code is a bug. Optimization comes AFTER correctness and only with benchmarks.
- Do not "test toward passing". Implement the intended behavior; tests verify it.
- When an AI review claims a vulnerability, verify that it is actually exploitable on Solana before acting. Many EVM-style findings are not applicable.
