/**
 * Minor-unit helpers.
 *
 * Monetary amounts are stored as integer minor units (USDC = 6 decimals) as
 * strings/bigint. Never use floats in domain logic; format only at the display edge.
 *
 * USDC_DECIMALS = 6 so "0.1" => 100000n, "1,000.50" => 100005000n.
 */

import { z } from 'zod'

export class MinorUnitsError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(`${code}: ${message}`)
    this.name = 'MinorUnitsError'
    this.code = code
  }
}

/**
 * Convert a decimal string to bigint minor units.
 * Accepts "0.1", "1,000.50", "100", etc. (thousands separators allowed).
 * Throws MinorUnitsError on empty/whitespace, negative, invalid format, or >6 decimals.
 */
export function decimalStringToBigInt(decimalString: string): bigint {
  const s = decimalString.trim()
  if (s === '') {
    throw new MinorUnitsError('ERROR_MINOR_UNITS_EMPTY', 'minor unit amount is empty')
  }
  if (s.startsWith('-')) {
    throw new MinorUnitsError('ERROR_MINOR_UNITS_NEGATIVE', 'minor unit amount must not be negative')
  }
  // Remove thousands separators (commas)
  const cleaned = s.replace(/,/g, '')
  // Must contain only digits and at most one decimal point
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw new MinorUnitsError('ERROR_MINOR_UNITS_INVALID', 'minor unit amount has an invalid format')
  }
  const [integerPart, decimalPart = ''] = cleaned.split('.')
  if (decimalPart.length > 6) {
    throw new MinorUnitsError('ERROR_MINOR_UNITS_TOO_MANY_DECIMALS', 'too many decimal places (max 6 for USDC)')
  }
  // Pad decimal part to exactly 6 digits
  const paddedDecimal = decimalPart.padEnd(6, '0')
  return BigInt(integerPart) * 1_000_000n + BigInt(paddedDecimal)
}

/**
 * Convert bigint minor units back to a comma-formatted decimal string.
 * e.g. 100000n => "0.100000", 100005000n => "1,000.500000".
 */
export function bigIntToDecimalString(minorUnits: bigint): string {
  const sign = minorUnits < 0n ? '-' : ''
  const absolute = minorUnits < 0n ? -minorUnits : minorUnits
  const integerPart = absolute / 1_000_000n
  const decimalPart = ('000000' + (absolute % 1_000_000n).toString()).slice(-6)
  const integerStr = integerPart.toString()
  const formattedInteger = integerStr.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  return `${sign}${formattedInteger}.${decimalPart}`
}

/** Parse an amount string, returning the raw string and the parsed minor units. */
export function parseAmountString(decimalString: string): { raw: string; minorUnits: bigint } {
  return { raw: decimalString, minorUnits: decimalStringToBigInt(decimalString) }
}

export const minorUnitsSchema = z.string().regex(/^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/, {
  message: 'amount must be a positive integer minor-unit string (max 6 decimals)',
})

/** Convert a minor-unit string to a bigint. */
export function parseMinorUnits(units: string): bigint {
  return decimalStringToBigInt(units)
}

/** Format a bigint minor unit back to a comma-separated decimal string. */
export function formatMinorUnits(units: bigint): string {
  return bigIntToDecimalString(units)
}

/**
 * Convert bigint minor units back to a clean decimal string suitable for
 * form inputs (no thousands separators, no trailing fractional zeros).
 * e.g. 1000000000n => "1000", 5050000000n => "5050".
 */
export function minorUnitsToInputString(minorUnits: bigint): string {
  const raw = bigIntToDecimalString(minorUnits)
  const withoutCommas = raw.replace(/,/g, '')
  if (withoutCommas.includes('.')) {
    const [i, d] = withoutCommas.split('.')
    const dTrim = d.replace(/0+$/, '')
    return dTrim ? `${i}.${dTrim}` : i
  }
  return withoutCommas
}