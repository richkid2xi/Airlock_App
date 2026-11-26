import { describe, it, expect } from 'vitest'
import { decimalStringToBigInt, bigIntToDecimalString, parseAmountString, MinorUnitsError } from './minorUnits'

describe('decimalStringToBigInt', () => {
  it('converts "0.1" to 100000n (USDC 6 decimals)', () => {
    expect(decimalStringToBigInt('0.1')).toBe(100_000n)
  })

  it('converts "1,000.50" to 1_000_500_000n', () => {
    expect(decimalStringToBigInt('1,000.50')).toBe(1_000_500_000n)
  })

  it('converts "100" to 100000000n', () => {
    expect(decimalStringToBigInt('100')).toBe(100_000_000n)
  })

  it('converts "0.000001" to 1n', () => {
    expect(decimalStringToBigInt('0.000001')).toBe(1n)
  })

  it('converts "42" to 42000000n', () => {
    expect(decimalStringToBigInt('42')).toBe(42_000_000n)
  })

  it('converts "1,000,000" to 1000000000000n', () => {
    expect(decimalStringToBigInt('1,000,000')).toBe(1_000_000_000_000n)
  })

  it('converts "0.123456" to 123456n (exact 6 decimals)', () => {
    expect(decimalStringToBigInt('0.123456')).toBe(123_456n)
  })
})

describe('decimalStringToBigInt errors', () => {
  it('throws MinorUnitsError with code ERROR_MINOR_UNITS_EMPTY on empty string', () => {
    expect(() => decimalStringToBigInt('')).toThrow(MinorUnitsError)
    try {
      decimalStringToBigInt('')
    } catch (e) {
      expect((e as MinorUnitsError).code).toBe('ERROR_MINOR_UNITS_EMPTY')
    }
  })

  it('throws on whitespace-only string', () => {
    expect(() => decimalStringToBigInt('   ')).toThrow(MinorUnitsError)
  })

  it('throws MinorUnitsError with code ERROR_MINOR_UNITS_NEGATIVE on negative amount', () => {
    try {
      decimalStringToBigInt('-5.25')
    } catch (e) {
      expect((e as MinorUnitsError).code).toBe('ERROR_MINOR_UNITS_NEGATIVE')
    }
  })

  it('throws MinorUnitsError with code ERROR_MINOR_UNITS_TOO_MANY_DECIMALS on >6 decimals', () => {
    try {
      decimalStringToBigInt('0.1234567')
    } catch (e) {
      expect((e as MinorUnitsError).code).toBe('ERROR_MINOR_UNITS_TOO_MANY_DECIMALS')
    }
  })

  it('throws MinorUnitsError with code ERROR_MINOR_UNITS_INVALID on invalid format', () => {
    try {
      decimalStringToBigInt('abc')
    } catch (e) {
      expect((e as MinorUnitsError).code).toBe('ERROR_MINOR_UNITS_INVALID')
    }
  })

  it('throws on multiple decimal points', () => {
    expect(() => decimalStringToBigInt('1.2.3')).toThrow(MinorUnitsError)
  })
})

describe('bigIntToDecimalString', () => {
  it('converts 100000n to "0.100000"', () => {
    expect(bigIntToDecimalString(100_000n)).toBe('0.100000')
  })

  it('converts 1_000_500_000n to "1,000.500000"', () => {
    expect(bigIntToDecimalString(1_000_500_000n)).toBe('1,000.500000')
  })

  it('converts 0n to "0.000000"', () => {
    expect(bigIntToDecimalString(0n)).toBe('0.000000')
  })

  it('converts 42000000n to "42.000000"', () => {
    expect(bigIntToDecimalString(42_000_000n)).toBe('42.000000')
  })

  it('handles negative values', () => {
    expect(bigIntToDecimalString(-1n)).toBe('-0.000001')
  })
})

describe('parseAmountString', () => {
  it('returns raw string and correct minor units for "0.1"', () => {
    const result = parseAmountString('0.1')
    expect(result.raw).toBe('0.1')
    expect(result.minorUnits).toBe(100_000n)
  })

  it('returns correct result for "1,000.50"', () => {
    const result = parseAmountString('1,000.50')
    expect(result.raw).toBe('1,000.50')
    expect(result.minorUnits).toBe(1_000_500_000n)
  })
})