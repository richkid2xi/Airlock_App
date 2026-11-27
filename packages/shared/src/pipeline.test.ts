import { describe, it, expect } from 'vitest';
import { derivePipeline, type PipelineInput } from './pipeline';

const allLive = {
  registry: true,
  requests: true,
  evaluation: true,
  approvals: true,
  chain: true,
};

function input(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    features: allLive,
    supplierCount: 0,
    verifiedSupplierCount: 0,
    invoiceCount: 0,
    openInvoiceCount: 0,
    attestedInvoiceCount: 0,
    requestCount: 0,
    heldCount: 0,
    receiptCount: 0,
    latestDecision: null,
    latestDecisionRule: null,
    ...overrides,
  };
}

describe('derivePipeline', () => {
  it('returns seven steps in order', () => {
    const steps = derivePipeline(input());
    expect(steps.map((s) => s.id)).toEqual([
      'suppliers',
      'invoices',
      'agent-request',
      'decision',
      'approval',
      'receipt',
      'on-chain',
    ]);
  });

  it('marks suppliers Done when counts exist and Waiting when empty', () => {
    const empty = derivePipeline(input());
    expect(empty[0].status).toBe('Waiting');
    expect(empty[0].actionLabel).toBe('Add supplier');

    const full = derivePipeline(input({ supplierCount: 3, verifiedSupplierCount: 2 }));
    expect(full[0].status).toBe('Done');
    expect(full[0].detail).toContain('3 suppliers');
    expect(full[0].detail).toContain('2 verified');
  });

  it('marks invoices Done with open/attested summary', () => {
    const steps = derivePipeline(input({ invoiceCount: 5, openInvoiceCount: 2, attestedInvoiceCount: 1 }));
    expect(steps[1].status).toBe('Done');
    expect(steps[1].detail).toContain('5 invoices');
    expect(steps[1].detail).toContain('2 open');
    expect(steps[1].detail).toContain('1 attested');
  });

  it('marks decision Blocked when latest decision is BLOCK', () => {
    const steps = derivePipeline(input({ requestCount: 1, latestDecision: 'BLOCK', latestDecisionRule: 'payee_mismatch' }));
    expect(steps[3].status).toBe('Blocked');
    expect(steps[3].detail).toContain('BLOCK');
    expect(steps[3].detail).toContain('payee_mismatch');
  });

  it('marks decision Done when latest decision is ALLOW', () => {
    const steps = derivePipeline(input({ requestCount: 1, latestDecision: 'ALLOW' }));
    expect(steps[3].status).toBe('Done');
  });

  it('marks decision Waiting when no decision recorded', () => {
    const steps = derivePipeline(input());
    expect(steps[3].status).toBe('Waiting');
  });

  it('marks approval Waiting when held count is positive', () => {
    const steps = derivePipeline(input({ heldCount: 2 }));
    expect(steps[4].status).toBe('Waiting');
    expect(steps[4].detail).toContain('2');
    expect(steps[4].actionLabel).toBe('Review held');
  });

  it('marks approval Done when no held items', () => {
    const steps = derivePipeline(input({ heldCount: 0 }));
    expect(steps[4].status).toBe('Done');
  });

  it('marks receipt Done only when receipts exist', () => {
    expect(derivePipeline(input({ receiptCount: 0 }))[5].status).toBe('Waiting');
    expect(derivePipeline(input({ receiptCount: 1 }))[5].status).toBe('Done');
  });

  it('never fabricates an on-chain signature; on-chain is In progress when chain is live', () => {
    const steps = derivePipeline(input());
    expect(steps[6].status).toBe('In progress');
    expect(steps[6].detail.toLowerCase()).not.toContain('signature:');
  });

  it('renders In progress for steps whose feature is gated', () => {
    const steps = derivePipeline(
      input({
        features: { registry: false, requests: false, evaluation: false, approvals: false, chain: false },
        supplierCount: 9,
        invoiceCount: 9,
        heldCount: 9,
      }),
    );
    for (const id of ['suppliers', 'invoices', 'agent-request', 'decision', 'approval', 'receipt']) {
      const step = steps.find((s) => s.id === id)!;
      expect(step.status).toBe('In progress');
      expect(step.live).toBe(false);
    }
  });

  it('is deterministic', () => {
    const a = derivePipeline(input({ supplierCount: 1, verifiedSupplierCount: 1, invoiceCount: 2, openInvoiceCount: 1 }));
    const b = derivePipeline(input({ supplierCount: 1, verifiedSupplierCount: 1, invoiceCount: 2, openInvoiceCount: 1 }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
