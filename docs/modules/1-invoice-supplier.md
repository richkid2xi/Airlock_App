# Module 1: Invoice & Supplier Engines

## Summary
Replaced simulated invoice and supplier mock mutations with the engine architecture (`src/engines/invoice/` and `src/engines/supplier/`), supporting types, mock persistence, live proxy, honest fallback, and non-intrusive "Mock data" badges.

## What Changed
- **Invoice Engine Port (`src/engines/invoice/types.ts`)**:
  - `listInvoices()`, `getInvoiceById()`, `getInvoiceByNumber()`, `createInvoice()`, `updateInvoiceStatus()`.
- **Mock Invoice Engine (`src/engines/invoice/mock.ts`)**:
  - Implements `InvoiceEnginePort` using seed data and typed session storage (`airlock-invoices-typed`).
  - Guards against duplicate invoice numbers and manages invoice lifecycle (`Open`, `Attested`, `Paid`, `Disputed`).
- **Live Invoice Engine (`src/engines/invoice/live.ts`)**:
  - Implements `InvoiceEnginePort` calling `VITE_INVOICE_API_URL` with structured error handling.
- **Invoice Engine Proxy (`src/engines/invoice/index.ts`)**:
  - Routes calls through `withFallback('invoice', liveFn, mockFn)` adhering to honest fallback rules.
- **Supplier Engine Port (`src/engines/supplier/types.ts`)**:
  - `listSuppliers()`, `getSupplierById()`, `getSupplierByName()`, `createSupplier()`, `verifySupplier()`, `updatePayoutWallet()`.
- **Mock Supplier Engine (`src/engines/supplier/mock.ts`)**:
  - Implements `SupplierEnginePort` with persistence (`airlock-suppliers-typed`), verification transitions, and payout wallet modification.
- **Live Supplier Engine (`src/engines/supplier/live.ts`)**:
  - Implements `SupplierEnginePort` connecting to `VITE_SUPPLIER_API_URL`.
- **Supplier Engine Proxy (`src/engines/supplier/index.ts`)**:
  - Routes calls through `withFallback('supplier', liveFn, mockFn)`.
- **UI Integration in `src/App.tsx`**:
  - Invoices and Suppliers pages display `<MockDataBadge engine="..." />` in page headings when running on mock or degraded data.
  - CRUD operations (create, verify, status update, wallet update) flow through the typed engines while maintaining bidirectional adapter compatibility with legacy views.
- **Tests**:
  - `src/engines/invoice/invoice.test.ts`: 4 unit tests covering list, lookup, duplicate rejection, and status updates.
  - `src/engines/supplier/supplier.test.ts`: 4 unit tests covering list, verification, payout wallet update, and supplier creation.
  - `.test-baseline` updated to 18 tests.

## Environment Variables
- `VITE_ENGINE_INVOICE=mock|live` (default: `mock`)
- `VITE_ENGINE_SUPPLIER=mock|live` (default: `mock`)
- `VITE_INVOICE_API_URL`: Optional endpoint for live invoice service.
- `VITE_SUPPLIER_API_URL`: Optional endpoint for live supplier service.
- `VITE_ALLOW_MOCK_FALLBACK=true|false` (default: `true`)

## How to Test
```bash
# Run tests and verify baseline test count >= 18
powershell -ExecutionPolicy Bypass -File ./scripts/test.ps1

# Run TypeScript type check
npx tsc --noEmit

# Run production build
pnpm run build
```

## Known Gaps
- Module 2 will introduce the Policy & Evaluation Engine to replace the Attack Lab deterministic lookup table with actual rule evaluation against active policy controls.
