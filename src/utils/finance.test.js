import { describe, expect, it } from 'vitest'
import {
  applyTransactionFilters,
  getCategoryTotals,
  getEffectiveConvertedAmount,
  getMonthSummary,
} from './finance'

const transactions = [
  {
    id: 1,
    description: 'Pagamento de serviço internacional',
    type: 'income',
    convertedAmount: 5197.5,
    fromCurrency: 'USD',
    toCurrency: 'BRL',
    categoryId: 'cat-services',
    accountId: 'acc-international',
    date: '2026-06-05',
    status: 'confirmed',
  },
  {
    id: 2,
    description: 'Compra compartilhada',
    type: 'expense',
    convertedAmount: 240,
    fromCurrency: 'BRL',
    toCurrency: 'BRL',
    categoryId: 'cat-food',
    accountId: 'acc-main',
    date: '2026-06-10',
    sharedAmountToReceive: 120,
    status: 'receivable',
  },
  {
    id: 3,
    description: 'Passe de transporte',
    type: 'expense',
    convertedAmount: 160,
    fromCurrency: 'BRL',
    toCurrency: 'BRL',
    categoryId: 'cat-transport',
    accountId: 'acc-main',
    date: '2026-05-10',
    status: 'confirmed',
  },
]

const emptyFilters = {
  search: '',
  type: 'all',
  categoryId: 'all',
  currency: 'all',
  status: 'all',
  startDate: '',
  endDate: '',
}

function getCategoryLabel(categoryId) {
  return {
    'cat-food': 'Alimentação',
    'cat-services': 'Serviços',
    'cat-transport': 'Transporte',
  }[categoryId]
}

describe('finance utilities', () => {
  it('summarizes income, expenses, receivables and foreign income by month without duplicating shared receivables', () => {
    const summary = getMonthSummary(transactions, '2026-06')

    expect(summary.income).toBe(5197.5)
    expect(summary.expenses).toBe(0)
    expect(summary.sharedReceivables).toBe(120)
    expect(summary.foreignIncome).toBe(5197.5)
    expect(summary.balance).toBe(5197.5)
  })

  it('groups monthly expenses by category id', () => {
    expect(getCategoryTotals(transactions, '2026-06')).toEqual([])
  })

  it('does not treat an empty month as all transactions', () => {
    const summary = getMonthSummary(transactions, '')

    expect(summary.income).toBe(0)
    expect(summary.expenses).toBe(0)
    expect(getCategoryTotals(transactions, '')).toEqual([])
  })

  it('uses current rates for receivable transactions and keeps confirmed values locked', () => {
    const summary = getMonthSummary(
      [
        {
          id: 4,
          description: 'Receita futura em moeda estrangeira',
          type: 'income',
          amount: 100,
          convertedAmount: 400,
          fromCurrency: 'USD',
          toCurrency: 'BRL',
          categoryId: 'cat-services',
          accountId: 'acc-main',
          date: '2026-06-20',
          status: 'receivable',
          exchangeLocked: false,
        },
        {
          id: 5,
          description: 'Receita confirmada em moeda estrangeira',
          type: 'income',
          amount: 100,
          convertedAmount: 500,
          fromCurrency: 'USD',
          toCurrency: 'BRL',
          categoryId: 'cat-services',
          accountId: 'acc-main',
          date: '2026-06-21',
          status: 'confirmed',
          exchangeLocked: true,
        },
      ],
      '2026-06',
      { USD_BRL: 6 },
    )

    expect(summary.sharedReceivables).toBe(600)
    expect(summary.income).toBe(500)
    expect(summary.balance).toBe(500)
  })

  it('previews pending foreign currency transactions with the current rate', () => {
    const transaction = {
      amount: 100,
      convertedAmount: 400,
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      status: 'receivable',
      exchangeLocked: false,
    }

    expect(getEffectiveConvertedAmount(transaction, { USD_BRL: 5.25 })).toBe(525)
    expect(getEffectiveConvertedAmount(transaction, { USD_BRL: 6 })).toBe(600)
  })

  it('keeps confirmed foreign currency transactions locked after rate updates', () => {
    const transaction = {
      amount: 100,
      convertedAmount: 519.75,
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      status: 'confirmed',
      exchangeLocked: true,
      rate: 5.1975,
      exchangeSource: 'Google Sheets / GOOGLEFINANCE',
    }

    expect(getEffectiveConvertedAmount(transaction, { USD_BRL: 6 })).toBe(519.75)
  })

  it('applies advanced filters', () => {
    const filtered = applyTransactionFilters(
      transactions,
      {
        ...emptyFilters,
        type: 'expense',
        status: 'receivable',
        search: 'alimentação',
      },
      getCategoryLabel,
    )

    expect(filtered).toHaveLength(1)
    expect(filtered[0].description).toBe('Compra compartilhada')
  })
})
