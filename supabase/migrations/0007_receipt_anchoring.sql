-- ---------------------------------------------------------------------------
-- Migration 0007: Receipt Anchoring on Solana
-- Adds anchor columns to receipts and RPC for recording anchors.
-- Anchoring is a separate action from receipt issuance; receipt status stays 'authorized'.
-- ---------------------------------------------------------------------------

-- Anchor columns on receipts
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS anchor_signature text,
  ADD COLUMN IF NOT EXISTS anchor_cluster text,
  ADD COLUMN IF NOT EXISTS anchored_at timestamptz;

-- RPC: record_receipt_anchor(receipt_id uuid, signature text) -> void
-- SECURITY DEFINER, SET search_path = '', EXECUTE to authenticated
-- Org-checked: receipt must exist in caller's org, must not already be anchored
-- Cluster is fixed to 'devnet' inside function (never from client)
CREATE OR REPLACE FUNCTION public.record_receipt_anchor(
  p_receipt_id uuid,
  p_signature text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_receipt_org_id uuid;
  v_existing_sig text;
BEGIN
  -- Caller's org
  SELECT o.id INTO v_org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  -- Validate receipt belongs to caller's org and get existing anchor
  SELECT org_id, anchor_signature INTO v_receipt_org_id, v_existing_sig
  FROM public.receipts
  WHERE id = p_receipt_id
  LIMIT 1;

  IF v_receipt_org_id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found or not in your organization';
  END IF;

  IF v_receipt_org_id <> v_org_id THEN
    RAISE EXCEPTION 'Receipt not found or not in your organization';
  END IF;

  IF v_existing_sig IS NOT NULL THEN
    RAISE EXCEPTION 'Receipt already anchored';
  END IF;

  -- Record anchor (cluster fixed to devnet per spec)
  UPDATE public.receipts
  SET anchor_signature = p_signature,
      anchor_cluster = 'devnet',
      anchored_at = now() AT TIME ZONE 'UTC'
  WHERE id = p_receipt_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_receipt_anchor(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_receipt_anchor(uuid, text) TO authenticated;

-- Verify receipt has not been tampered - content hash check
-- Receipt integrity hash stored in receipt hash column (already exists from 0005)
-- Memo format: "airlock:v1:<receiptId>:<contentHash>"
-- This migration does not add a hash column; it relies on the existing receipt.hash
-- which was added in 0005 as the integrity hash.