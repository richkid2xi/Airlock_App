export type PipelineStepStatus = 'Done' | 'Waiting' | 'Blocked' | 'In progress';

export type PipelineFeatureFlags = {
  registry: boolean;
  requests: boolean;
  evaluation: boolean;
  approvals: boolean;
  chain: boolean;
};

export type PipelineInput = {
  features: PipelineFeatureFlags;
  supplierCount: number;
  verifiedSupplierCount: number;
  invoiceCount: number;
  openInvoiceCount: number;
  attestedInvoiceCount: number;
  requestCount: number;
  heldCount: number;
  receiptCount: number;
  latestDecision?: string | null;
  latestDecisionRule?: string | null;
};

export type PipelineStep = {
  id: string;
  title: string;
  live: boolean;
  status: PipelineStepStatus;
  detail: string;
  actionLabel?: string;
  actionTo?: string;
};

export function derivePipeline(input: PipelineInput): PipelineStep[] {
  const flags = input.features;

  const supplierStep: PipelineStep = flags.registry
    ? {
        id: 'suppliers',
        title: 'Suppliers',
        live: true,
        status: input.supplierCount === 0 ? 'Waiting' : 'Done',
        detail: `Registered ${input.supplierCount} suppliers · ${input.verifiedSupplierCount} verified.`,
        actionLabel: input.supplierCount === 0 ? 'Add supplier' : undefined,
        actionTo: input.supplierCount === 0 ? '/app/suppliers' : undefined,
      }
    : {
        id: 'suppliers',
        title: 'Suppliers',
        live: false,
        status: 'In progress',
        detail: 'Supplier registry is not live yet.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const invoiceStep: PipelineStep = flags.registry
    ? {
        id: 'invoices',
        title: 'Invoices',
        live: true,
        status: input.invoiceCount === 0 ? 'Waiting' : 'Done',
        detail: `Registered ${input.invoiceCount} invoices · ${input.openInvoiceCount} open · ${input.attestedInvoiceCount} attested.`,
        actionLabel: input.invoiceCount === 0 ? 'Register invoice' : undefined,
        actionTo: input.invoiceCount === 0 ? '/app/invoices' : undefined,
      }
    : {
        id: 'invoices',
        title: 'Invoices',
        live: false,
        status: 'In progress',
        detail: 'Invoice register is not live yet.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const requestStep: PipelineStep = flags.requests
    ? {
        id: 'agent-request',
        title: 'Agent request',
        live: true,
        status: input.requestCount === 0 ? 'Waiting' : 'Done',
        detail: input.requestCount === 0 ? 'No agent requests yet. Run an attack demo or submit a request.' : `Latest agent request recorded (${input.requestCount} total).`,
        actionLabel: input.requestCount === 0 ? 'Run agent' : undefined,
        actionTo: input.requestCount === 0 ? '/app/attack-lab' : undefined,
      }
    : {
        id: 'agent-request',
        title: 'Agent request',
        live: false,
        status: 'In progress',
        detail: 'Payment request engine is not live yet; attack lab provides simulated request flow.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const decisionStep: PipelineStep = flags.requests && flags.evaluation
    ? {
        id: 'decision',
        title: 'Decision',
        live: true,
        status: input.latestDecision ? (input.latestDecision === 'BLOCK' ? 'Blocked' : 'Done') : 'Waiting',
        detail: input.latestDecision
          ? `Latest decision ${input.latestDecision}${input.latestDecisionRule ? ` via rule ${input.latestDecisionRule}` : ''}.`
          : 'No decision recorded yet.',
        actionLabel: input.latestDecision ? undefined : 'Run agent',
        actionTo: input.latestDecision ? undefined : '/app/attack-lab',
      }
    : {
        id: 'decision',
        title: 'Decision',
        live: false,
        status: 'In progress',
        detail: 'Evaluation pipeline is not live yet; attack lab provides simulated decisions.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const approvalStep: PipelineStep = flags.approvals
    ? {
        id: 'approval',
        title: 'Approval',
        live: true,
        status: input.heldCount > 0 ? 'Waiting' : 'Done',
        detail: `Held items awaiting human decision: ${input.heldCount}.`,
        actionLabel: input.heldCount > 0 ? 'Review held' : undefined,
        actionTo: input.heldCount > 0 ? '/app/approvals' : undefined,
      }
    : {
        id: 'approval',
        title: 'Approval',
        live: false,
        status: 'In progress',
        detail: 'Approval workflow is not live yet; approvals engine pending.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const receiptStep: PipelineStep = flags.approvals
    ? {
        id: 'receipt',
        title: 'Receipt',
        live: true,
        status: input.receiptCount > 0 ? 'Done' : 'Waiting',
        detail: `Receipts issued: ${input.receiptCount}. Integrity verified via content hash.`,
        actionLabel: input.receiptCount > 0 ? undefined : 'View receipt',
        actionTo: input.receiptCount > 0 ? '/app/receipts' : undefined,
      }
    : {
        id: 'receipt',
        title: 'Receipt',
        live: false,
        status: 'In progress',
        detail: 'Receipts engine is not live yet.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const chainStep: PipelineStep = flags.chain
    ? {
        id: 'on-chain',
        title: 'On-chain settlement',
        live: true,
        status: 'In progress',
        detail: 'On-chain settlement is configured; awaiting devnet transfer integration.',
        actionLabel: undefined,
        actionTo: undefined,
      }
    : {
        id: 'on-chain',
        title: 'On-chain settlement',
        live: false,
        status: 'In progress',
        detail: 'On-chain settlement is not live yet; no signature is fabricated.',
        actionLabel: undefined,
        actionTo: undefined,
      };

  const steps: PipelineStep[] = [
    supplierStep,
    invoiceStep,
    requestStep,
    decisionStep,
    approvalStep,
    receiptStep,
    chainStep,
  ];

  return steps;
}
