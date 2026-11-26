/**
 * Money utilities: integer minor units as bigint/string. Never floats.
 * Default token: USDC (6 decimals).
 */

export const USDC_DECIMALS = 6

/**
 * Converts a decimal string or number (e.g. "12480.50" or 12480) into integer minor units string.
 * Example: toMinorUnits("12480.00", 6) => "12480000000"
 */
export function toMinorUnits(amount: string | number, decimals: number = USDC_DECIMALS): string {
  if (typeof amount === 'number') {
    amount = amount.toString()
  }
  const clean = amount.trim().replace(/,/g, '').replace(/^[^\d.-]+/, '') // strip currency symbols
  if (!clean || isNaN(Number(clean))) return '0'

  const [intPart, fracPart = ''] = clean.split('.')
  const isNegative = intPart.startsWith('-')
  const absInt = intPart.replace('-', '')
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  
  const totalStr = (absInt + paddedFrac).replace(/^0+/, '') || '0'
  return isNegative && totalStr !== '0' ? `-${totalStr}` : totalStr
}

/**
 * Converts integer minor units string into decimal string with given decimals.
 * Example: fromMinorUnits("12480000000", 6) => "12480.00"
 */
export function fromMinorUnits(units: string | bigint, decimals: number = USDC_DECIMALS): string {
  const str = units.toString()
  const isNegative = str.startsWith('-')
  const abs = str.replace('-', '')
  
  if (abs.length <= decimals) {
    const zeroPadded = abs.padStart(decimals, '0')
    const res = `0.${zeroPadded}`
    return isNegative ? `-${res}` : res
  }
  
  const intPart = abs.slice(0, abs.length - decimals)
  const fracPart = abs.slice(abs.length - decimals)
  const res = `${intPart}.${fracPart}`
  return isNegative ? `-${res}` : res
}

/**
 * Formats integer minor units for user display only at the display edge.
 * Example: formatMinorUnits("12480000000", 6, "€") => "€12,480.00"
 */
export function formatMinorUnits(
  units: string | bigint,
  decimals: number = USDC_DECIMALS,
  currencySymbol: string = '€'
): string {
  const dec = fromMinorUnits(units, decimals)
  const [intPart, fracPart] = dec.split('.')
  const formattedInt = Number(intPart).toLocaleString('en-US')
  return `${currencySymbol}${formattedInt}.${fracPart}`
}

/**
 * Formats integer minor units as USDC string.
 * Example: formatUSDC("12480000000") => "12,480.00 USDC"
 */
export function formatUSDC(units: string | bigint): string {
  const dec = fromMinorUnits(units, USDC_DECIMALS)
  const [intPart, fracPart] = dec.split('.')
  const formattedInt = Number(intPart).toLocaleString('en-US')
  return `${formattedInt}.${fracPart} USDC`
}
