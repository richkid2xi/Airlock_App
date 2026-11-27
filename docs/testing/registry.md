# Registry Module — Manual Verification Checklist

## Prerequisites
- Local dev server running: `pnpm dev`
- Connected wallet on devnet
- Completed onboarding (org exists)

---

## 1. Suppliers

### 1.1 List & search
- [ ] Navigate to **Suppliers** in sidebar
- [ ] Table loads with columns: Name, Category, Payout wallet (masked), Verification, Actions
- [ ] Enter search term in search box → list filters in real-time
- [ ] Click **Verification** filter dropdown → select `unverified` / `verified` / `review_required` → list filters

### 1.2 Create supplier
- [ ] Click **Create supplier** button → modal opens
- [ ] Fill required fields: Name, Payout wallet (valid base58, 32 bytes)
- [ ] Fill optional: Business email, Category, Notes
- [ ] Click **Create supplier** → toast "Supplier X created"
- [ ] New row appears at top of list

### 1.3 Verify supplier
- [ ] Find an `unverified` supplier → click **Verify**
- [ ] Toast "Supplier X verified"
- [ ] Row shows `verified` badge, Verify button disappears

### 1.4 Edit supplier
- [ ] Click **Edit** on a verified supplier → modal pre-fills
- [ ] Change Name, Payout wallet, Category, etc.
- [ ] Click **Update supplier** → toast "Supplier X updated"
- [ ] **Notice banner** appears: "Payout wallet changed: verification reset"
- [ ] Supplier row reverts to `unverified`, Verify button reappears
- [ ] Notice auto-dismisses after ~5s

### 1.5 Empty state
- [ ] If no suppliers exist → "No suppliers yet. Add your first supplier to get started."

---

## 2. Invoices

### 2.1 List, search & filter
- [ ] Navigate to **Invoices**
- [ ] Table: Invoice #, Supplier, Amount, Due, Status, Actions
- [ ] Search box filters by invoice number & supplier name
- [ ] Status filter dropdown: All / Open / Attested / Paid / Disputed

### 2.2 Register invoice
- [ ] Click **Register invoice** → modal
- [ ] Fill: Invoice #, Supplier (dropdown), Amount (minor units), Currency, Issue date, Due date, Document ref, Notes
- [ ] Submit → toast "Invoice INV-... registered"
- [ ] Row appears with status `open`

### 2.3 Detail modal
- [ ] Click invoice number link → detail modal opens
- [ ] Shows: Amount, Status, Issue/Due dates, Mint, Document ref, Notes, Timeline (Registered / Attested / Disputed / Paid)
- [ ] **Document** section:
  - If no document: "No document uploaded" + **Upload document** button (file picker)
  - If document exists: **View document** button → opens signed URL in new tab
- [ ] Actions: **Attest delivery** / **Dispute** (only when status `open`), **Close**

### 2.4 Attest / Dispute
- [ ] In detail modal on `open` invoice → click **Attest delivery** → toast "Invoice ... attested", status badge changes to `attested`, timeline updated
- [ ] On another `open` invoice → click **Dispute** → toast "Invoice ... disputed", status `disputed`

### 2.5 Document upload
- [ ] In detail modal → **Upload document** → pick PDF/PNG/JPEG ≤10MB
- [ ] Toast "Document uploaded for INV-..."
- [ ] **View document** appears → click → signed URL opens in new tab

### 2.6 Empty state
- [ ] If no invoices match filters → "No invoices match your filters."

---

## 3. Policies

### 3.1 List & search
- [ ] Navigate to **Policies**
- [ ] Table: Name, Description, Max invoice, Daily cap, Controls, Actions
- [ ] Search box filters by name & description

### 3.2 Create policy
- [ ] Click **Create policy** → modal
- [ ] Fill: Name, Description, Max invoice (minor), Daily cap (minor)
- [ ] Enable controls: Verified supplier, Delivery attestation, Agent intent, Supporting evidence, Two-person approval
- [ ] Assign agents (multi-select)
- [ ] Submit → toast "Policy X created"
- [ ] Row appears with active controls count

### 3.3 Edit policy
- [ ] Click **Edit** on a policy → modal pre-fills
- [ ] Modify limits, controls, agent assignments
- [ ] Submit → toast "Policy X updated"

### 3.4 Detail modal
- [ ] Click **Details** → modal shows: Status, Max invoice, Daily cap, Active controls count, Assigned agents list

### 3.5 Empty state
- [ ] If no policies → "No policies yet."

---

## 4. AI Agents

### 4.1 List
- [ ] Navigate to **AI Agents**
- [ ] Table: Name, Identifier, Limits, Status, Actions
- [ ] Limits show formatted (per-request / daily) with currency

### 4.2 Create agent
- [ ] Click **Add agent** → modal
- [ ] Fill: Name, Identifier, Description, Per-request limit, Daily limit, Currency, Status, Policies
- [ ] Inline validation: per-request > 0, daily ≥ per-request (red inline errors)
- [ ] Submit → toast "Agent X created"

### 4.3 Edit agent
- [ ] Click **Edit** → modal pre-fills (Identifier shown read-only)
- [ ] Modify limits, status, policies
- [ ] Inline validation on limit fields
- [ ] Submit → toast "Agent X updated"

### 4.4 Status toggle
- [ ] Click **Disable** / **Enable** → toast "Agent X disabled/enabled", status badge updates

### 4.5 Empty state
- [ ] If no agents → "No agents yet. Add your first agent."

---

## 5. Settings → Demo data

### 5.1 Load demo data
- [ ] Navigate to **Settings** → **Demo data** (sidebar)
- [ ] Click **Load demo data** → toast "Demo data loaded."
- [ ] Verify: Suppliers, Invoices, Policies, Agents lists now populated

### 5.2 Reset demo data
- [ ] Click **Reset demo data** → confirm dialog appears
- [ ] Click **Reset demo data** (danger) → toast "Demo data reset."
- [ ] Suppliers, Invoices, Policies, Agents lists return to empty state
- [ ] Organization & wallet identity unchanged

---

## 6. Cross-cutting

- [ ] All modals dismiss on Escape / backdrop click
- [ ] Loading states disable buttons & show spinner
- [ ] Error toasts show `code: message` (e.g. `validation: ...`)
- [ ] No hard-coded business data anywhere (all from engine or InProgress)
- [ ] Policies feature gate is **LIVE** → no InProgress panel on Policies page