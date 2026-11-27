# Golden Vector Proposal — Decision Engine & Requests Slice

Purpose: define the pure off-chain decision rule set the evaluator must implement for payment requests, before any engine or migration code is written.

## New vector shape

```ts
{
  id: string                  // e.g. "GV-011"
  description: string         // plain-language scenario
  input: {
    org: string               // organisation id (UUID), org-scoping only
    agent: {
      id: string
      name: string
      identifier: string
      status: 'active' | 'disabled'
      perRequestLimitMinor: string   // minor-unit string
      dailyLimitMinor: string
    }
    policy: {
      id: string
      name: string
      controls: {
        verifiedSupplierRequired: boolean
        deliveryAttestationRequired: boolean
        agentIntentRequired: boolean
        supportingEvidenceRequired: boolean
        twoPersonApproval: boolean
      }
      approvalThresholdMinor?: string   // minor-unit string, optional
      maxInvoiceMinor?: string
    }
    supplier: {
      id: string
      name: string
      payoutWallet: string           // base58
      verificationStatus: 'verified' | 'unverified' | 'review_required'
    }
    invoice: {
      id: string
      invoiceNumber: string
      supplierId: string
      payeeWallet: string            // base58
      amountMinor: string            // minor-unit string
      currency: string               // 'USDC' | 'EUR' | 'USD' | 'GBP'
      mint: string | null
      status: 'open' | 'attested' | 'paid' | 'disputed'
    }
    request: {
      invoiceId: string
      claimedPayee?: string          // base58 payee the agent wants paid
      claimedAmountMinor?: string    // minor-unit string
      claimedMint?: string
    }
    history: {
      committedTodayMinor: string    // sum of approved/paid evaluations today
      committedInvoiceIds: string[]  // invoice ids already committed
    }
    now: string                    // ISO-8601 instant used as "now"
  }
  expected: {
    decision: 'ALLOW' | 'BLOCK' | 'HOLD'
    failedRule?: string              // ruleCode when BLOCK/HOLD
    reasonCode: string               // e.g. agent_disabled, invoice_not_found, needs_attestation
    onChainEnforced: boolean         // true when rule is hard-cap/enforceable on-chain
  }
}
```

Money is integer minor units as strings everywhere — never floats.

## Rule order (first BLOCK decides, otherwise collect HOLDs)

1. agent active → BLOCK `agent_disabled`
2. invoice exists in same org → BLOCK `invoice_not_found`
3. committed or disputed → BLOCK `invoice_already_paid` / `invoice_disputed`
4. claimed payee / amount / mint must equal invoice → BLOCK `payee_mismatch` / `amount_mismatch` / `mint_mismatch`
5. above agent per-request limit or policy max invoice → BLOCK `over_limit`
6. today's committed total + amount above daily cap → BLOCK `daily_cap_exceeded`
7. policy requires verified supplier and it is not → BLOCK `supplier_unverified`
8. attestation required but missing → HOLD `needs_attestation`
9. above approval threshold or two-person approval → HOLD `needs_approval`
otherwise ALLOW.

`onChainEnforced` is true for rules 1–7 (hard caps/allowlists). Rules 8–9 are HOLDs (off-chain delay, not a hard cap on-chain alone).

## Vectors GV-001..GV-010

Kept untouched in the existing `packages/golden/evaluationVectors.ts`. New vectors GV-011..GV-030 below use the new shape and drive the new pure evaluator.

## New vectors GV-011..GV-030

- GV-011: Amount exactly at limit → ALLOW
- GV-012: One minor unit over limit → BLOCK over_limit
- GV-013: Same invoice twice → BLOCK invoice_already_paid (second request commits the same committed invoice id)
- GV-014: Already committed invoice → BLOCK invoice_already_paid
- GV-015: Disputed invoice → BLOCK invoice_disputed
- GV-016: Agent disabled → BLOCK agent_disabled
- GV-017: Claimed payee different → BLOCK payee_mismatch
- GV-018: Claimed payee equal → ALLOW
- GV-019: Claimed amount different → BLOCK amount_mismatch
- GV-020: Claimed mint different → BLOCK mint_mismatch
- GV-021: Supplier unverified (policy requires verified) → BLOCK supplier_unverified
- GV-022: Wallet changed after verification → supplier review_required → BLOCK supplier_unverified
- GV-023: Daily cap reached exactly → ALLOW (at cap, not over)
- GV-024: Daily cap exceeded → BLOCK daily_cap_exceeded
- GV-025: Above approval threshold → HOLD needs_approval
- GV-026: Two-person approval → HOLD needs_approval
- GV-027: Missing attestation → HOLD needs_attestation
- GV-028: Another organisation's invoice → BLOCK invoice_not_found
- GV-029: Unknown invoice → BLOCK invoice_not_found
- GV-030: All controls pass, under all caps → ALLOW

Differences logged under "Decisions" in the implementation notes below once the evaluator is written.
