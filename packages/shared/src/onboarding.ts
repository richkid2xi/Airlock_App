import { z } from 'zod'
import { decimalStringToBigInt } from './minorUnits'

/**
 * Onboarding zod schemas (shared by web client, Edge Functions, and tests).
 *
 * Step 1 collects organization data; step 2 collects payment boundaries with a
 * cross-field rule: approval threshold <= max invoice amount.
 *
 * Monetary values are kept as strings in the validated output (minor-unit strings)
 * so form state stays stable; they are parsed to bigint only for validation.
 */

const DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/

export const OnboardingStep1Schema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, 'Organization name is required')
    .refine(
      (val) => /^[\p{L}\p{N}\s\-&().,:;'\"_@]+$/u.test(val),
      'Organization name contains invalid characters',
    ),
  businessEmail: z
    .string()
    .trim()
    .min(1, 'A business email is required')
    .email('A valid business email is required')
    .transform((val) => val.toLowerCase()),
  industry: z.string().trim().optional(),
  size: z.string().trim().optional(),
})

export type OnboardingStep1 = z.infer<typeof OnboardingStep1Schema>

export const OnboardingStep2Schema = z
  .object({
    approvalThreshold: z
      .string()
      .trim()
      .min(1, 'Approval threshold is required')
      .refine((val) => DECIMAL_PATTERN.test(val), 'Approval threshold must be a valid decimal number (max 6 decimals)'),
    maxInvoiceAmount: z
      .string()
      .trim()
      .min(1, 'Max invoice amount is required')
      .refine((val) => DECIMAL_PATTERN.test(val), 'Max invoice amount must be a valid decimal number (max 6 decimals)'),
  })
  .refine(
    (data) => {
      try {
        return decimalStringToBigInt(data.approvalThreshold) <= decimalStringToBigInt(data.maxInvoiceAmount)
      } catch {
        return false
      }
    },
    {
      message: 'Approval threshold must not be greater than max invoice amount',
      path: ['approvalThreshold'],
    },
  )

export type OnboardingStep2 = z.infer<typeof OnboardingStep2Schema>