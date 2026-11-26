import { describe, it, expect } from 'vitest'
import { OnboardingStep1Schema, OnboardingStep2Schema } from './onboarding'

describe('OnboardingStep1Schema', () => {
  const validData = {
    organizationName: 'Acme Corp',
    businessEmail: 'contact@acme.example',
    industry: 'Manufacturing',
    size: 'Medium',
  }

  it('validates complete step 1 data', () => {
    const result = OnboardingStep1Schema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('normalizes email to lowercase', () => {
    const result = OnboardingStep1Schema.safeParse({ ...validData, businessEmail: 'Contact@ACME.Example' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.businessEmail).toBe('contact@acme.example')
    }
  })

  it('fails without organizationName', () => {
    const result = OnboardingStep1Schema.safeParse({ ...validData, organizationName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.organizationName).toContain('Organization name is required')
    }
  })

  it('fails with invalid email format', () => {
    const result = OnboardingStep1Schema.safeParse({ ...validData, businessEmail: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.businessEmail).toContain('A valid business email is required')
    }
  })

  it('accepts optional fields as empty strings', () => {
    const result = OnboardingStep1Schema.safeParse({
      organizationName: 'Test',
      businessEmail: 'test@test.example',
      industry: '',
      size: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('OnboardingStep2Schema', () => {
  const validData = {
    approvalThreshold: '500.00',
    maxInvoiceAmount: '2000.00',
  }

  it('validates step 2 with threshold <= max invoice', () => {
    const result = OnboardingStep2Schema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('fails when threshold > max invoice', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: '3000.00',
      maxInvoiceAmount: '2000.00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.approvalThreshold).toContain(
        'Approval threshold must not be greater than max invoice amount',
      )
    }
  })

  it('fails on non-numeric approval threshold', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: 'not-a-number',
      maxInvoiceAmount: '2000.00',
    })
    expect(result.success).toBe(false)
  })

  it('fails on non-numeric max invoice amount', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: '500.00',
      maxInvoiceAmount: 'not-a-number',
    })
    expect(result.success).toBe(false)
  })

  it('validates amounts with decimals up to 6 places', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: '123.456789',
      maxInvoiceAmount: '999.999999',
    })
    expect(result.success).toBe(true)
  })

  it('fails on amounts with more than 6 decimals', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: '0.1234567',
      maxInvoiceAmount: '1000.00',
    })
    expect(result.success).toBe(false)
  })

  it('fails on empty approval threshold', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: '',
      maxInvoiceAmount: '2000.00',
    })
    expect(result.success).toBe(false)
  })

  it('fails on empty max invoice amount', () => {
    const result = OnboardingStep2Schema.safeParse({
      approvalThreshold: '500.00',
      maxInvoiceAmount: '',
    })
    expect(result.success).toBe(false)
  })
})