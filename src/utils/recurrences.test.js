import { describe, expect, it } from 'vitest'
import {
  applyRecurrenceScopeUpdate,
  filterRecurrenceScope,
  generateInstallmentSchedule,
} from './recurrences'

function createInstallments(total = 6) {
  return Array.from({ length: total }, (_, index) => {
    const installmentNumber = index + 1
    const month = String(6 + index).padStart(2, '0')

    return {
      id: `installment-${installmentNumber}`,
      description: `Compra parcelada (${installmentNumber}/${total})`,
      recurrenceType: 'installment',
      recurrenceId: 'parc-demo',
      installmentNumber,
      installmentTotal: total,
      date: `2026-${month}-15`,
      amount: 400,
      convertedAmount: 400,
      status: 'pending',
    }
  })
}

describe('recurrence utilities', () => {
  it('generates all installment labels and monthly dates', () => {
    const schedule = generateInstallmentSchedule({
      description: 'Compra parcelada',
      amount: 2400,
      amountMode: 'total',
      installmentTotal: 6,
      installmentStartNumber: 1,
      firstDate: '2026-06-15',
    })

    expect(schedule).toHaveLength(6)
    expect(schedule.map((item) => item.description)).toEqual([
      'Compra parcelada (1/6)',
      'Compra parcelada (2/6)',
      'Compra parcelada (3/6)',
      'Compra parcelada (4/6)',
      'Compra parcelada (5/6)',
      'Compra parcelada (6/6)',
    ])
    expect(schedule.map((item) => item.occurrenceDate)).toEqual([
      '2026-06-15',
      '2026-07-15',
      '2026-08-15',
      '2026-09-15',
      '2026-10-15',
      '2026-11-15',
    ])
    expect(schedule.every((item) => item.amount === 400)).toBe(true)
  })

  it('updates only the selected occurrence when scope is single', () => {
    const installments = createInstallments()
    const source = installments[2]
    const updated = applyRecurrenceScopeUpdate(
      installments,
      source,
      'single',
      (transaction) => ({ ...transaction, status: 'confirmed' }),
    )

    expect(updated.filter((transaction) => transaction.status === 'confirmed')).toHaveLength(1)
    expect(updated[2].status).toBe('confirmed')
  })

  it('updates current and next installments without changing previous ones', () => {
    const installments = createInstallments()
    const source = installments[2]
    const updated = applyRecurrenceScopeUpdate(
      installments,
      source,
      'future',
      (transaction) => ({ ...transaction, categoryId: 'cat-edited' }),
    )

    expect(updated.slice(0, 2).every((transaction) => !transaction.categoryId)).toBe(true)
    expect(
      updated.slice(2).every((transaction) => transaction.categoryId === 'cat-edited'),
    ).toBe(true)
  })

  it('updates the whole recurrence when scope is all', () => {
    const installments = createInstallments()
    const updated = applyRecurrenceScopeUpdate(
      installments,
      installments[2],
      'all',
      (transaction) => ({ ...transaction, accountId: 'acc-edited' }),
    )

    expect(updated.every((transaction) => transaction.accountId === 'acc-edited')).toBe(true)
  })

  it('removes only the selected occurrence when deletion scope is single', () => {
    const installments = createInstallments()
    const remaining = filterRecurrenceScope(installments, installments[2], 'single')

    expect(remaining).toHaveLength(5)
    expect(remaining.some((transaction) => transaction.id === 'installment-3')).toBe(false)
  })

  it('removes current and next installments while preserving previous ones', () => {
    const installments = createInstallments()
    const remaining = filterRecurrenceScope(installments, installments[2], 'future')

    expect(remaining.map((transaction) => transaction.installmentNumber)).toEqual([1, 2])
  })

  it('removes the whole recurrence when deletion scope is all', () => {
    const installments = createInstallments()
    const remaining = filterRecurrenceScope(installments, installments[2], 'all')

    expect(remaining).toEqual([])
  })
})
