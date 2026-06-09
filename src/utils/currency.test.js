import { describe, expect, it } from 'vitest'
import { convertCurrency, formatCurrency, getConversionDetails } from './currency'

describe('currency utilities', () => {
  it('converts with percentage fee and fixed fee', () => {
    const details = getConversionDetails({
      amount: 1000,
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      rates: { USD_BRL: 5.25 },
      percentageFee: 1,
      fixedFee: 0,
    })

    expect(details.grossAmount).toBe(5250)
    expect(details.percentageFeeAmount).toBe(52.5)
    expect(details.finalAmount).toBe(5197.5)
  })

  it('uses manual rate before API rates', () => {
    const converted = convertCurrency({
      amount: 100,
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      rates: { USD_BRL: 4 },
      manualRate: 5,
    })

    expect(converted).toBe(500)
  })

  it('formats supported currencies', () => {
    expect(formatCurrency(5197.5, 'BRL')).toBe('R$ 5.197,50')
    expect(formatCurrency(1000, 'USD')).toBe('US$ 1.000,00')
    expect(formatCurrency(1000, 'EUR')).toBe('€ 1.000,00')
  })
})
