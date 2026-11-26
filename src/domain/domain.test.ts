import { describe, it, expect } from 'vitest'
import { toMinorUnits, fromMinorUnits, formatMinorUnits, formatUSDC } from './money'
import {
  invoiceToRow,
  invoiceFromRow,
  supplierToRow,
  supplierFromRow,
  agentToRow,
  agentFromRow,
  paymentRequestToRow,
  paymentRequestFromRow,
} from './adapters'
import { SEED_INVOICES, SEED_SUPPLIERS, SEED_AGENTS, SEED_REQUESTS } from './seed'

describe('Domain: Money calculations and minor units', () => {
  it('converts decimal amounts to integer minor units (USDC 6 decimals)', () => {
    expect(toMinorUnits('12480.00')).toBe('12480000000')
    expect(toMinorUnits('0.50')).toBe('500000')
    expect(toMinorUnits('10')).toBe('10000000')
    expect(toMinorUnits('€12,480.00')).toBe('12480000000')
    expect(toMinorUnits('$100.50')).toBe('100500000')
  })

  it('converts minor units back to decimal string', () => {
    expect(fromMinorUnits('12480000000')).toBe('12480.000000')
    expect(fromMinorUnits('500000')).toBe('0.500000')
  })

  it('formats minor units for display', () => {
    expect(formatMinorUnits('12480000000', 6, '€')).toBe('€12,480.000000')
    expect(formatUSDC('12480000000')).toBe('12,480.000000 USDC')
  })
})

describe('Domain: Positional row adapters', () => {
  it('converts invoice to row and back idempotently', () => {
    const inv = SEED_INVOICES[0]
    const row = invoiceToRow(inv, '€')
    expect(row[0]).toBe('INV-2057')
    expect(row[1]).toBe('Amazon Web Services')
    expect(row[5]).toBe('Open')

    const reconstructed = invoiceFromRow(row, inv.id)
    expect(reconstructed.number).toBe(inv.number)
    expect(reconstructed.supplierName).toBe(inv.supplierName)
    expect(reconstructed.amountUnits).toBe(inv.amountUnits)
    expect(reconstructed.status).toBe(inv.status)
  })

  it('converts supplier to row and back', () => {
    const sup = SEED_SUPPLIERS[0]
    const row = supplierToRow(sup)
    expect(row[0]).toBe('Amazon Web Services')
    expect(row[2]).toBe('Verified')
    expect(row[5]).toBe('Active')

    const reconstructed = supplierFromRow(row, sup.id)
    expect(reconstructed.name).toBe(sup.name)
    expect(reconstructed.verificationStatus).toBe(sup.verificationStatus)
  })

  it('converts agent to row and back', () => {
    const agt = SEED_AGENTS[0]
    const row = agentToRow(agt, '€')
    expect(row[0]).toBe('ProcureBot')
    expect(row[2]).toBe('Active')

    const reconstructed = agentFromRow(row, agt.id)
    expect(reconstructed.name).toBe(agt.name)
    expect(reconstructed.perRequestLimitUnits).toBe(agt.perRequestLimitUnits)
  })

  it('converts payment request to row and back', () => {
    const req = SEED_REQUESTS[0]
    const row = paymentRequestToRow(req, '€')
    expect(row[0]).toBe('INV-2048')
    expect(row[4]).toBe('ALLOW')

    const reconstructed = paymentRequestFromRow(row, req.id)
    expect(reconstructed.invoiceNumber).toBe(req.invoiceNumber)
    expect(reconstructed.decision).toBe('ALLOW')
  })
})
