import { formatCurrency } from './currency'
import { formatDate, isBalanceTransaction } from './finance'

export const recurrenceTypeLabels = {
  none: 'Não repetir',
  fixed: 'Fixa mensal',
  installment: 'Parcelada',
}

export function addMonthsToDate(dateValue, amount) {
  if (!dateValue || !dateValue.includes('-')) {
    return dateValue
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  const nextDate = new Date(year, month - 1 + amount, 1)
  const lastDay = new Date(
    nextDate.getFullYear(),
    nextDate.getMonth() + 1,
    0,
  ).getDate()
  const safeDay = Math.min(day, lastDay)

  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(safeDay).padStart(2, '0')}`
}

export function getDateWithDay(baseDate, repeatDay) {
  const [year, month] = baseDate.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const safeDay = Math.min(Math.max(Number(repeatDay) || 1, 1), lastDay)

  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(
    2,
    '0',
  )}`
}

export function getScopeFromPrompt(action = 'editar') {
  const answer = window.prompt(
    `${action === 'delete' ? 'Excluir' : 'Editar'} recorrência/parcelamento:\n1 - Só este mês\n2 - Esta e as próximas\n3 - Toda a recorrência`,
    '1',
  )

  if (answer === null) {
    return ''
  }

  if (answer === '2') {
    return 'future'
  }

  if (answer === '3') {
    return 'all'
  }

  return 'single'
}

export function isRecurringTransaction(transaction) {
  return (
    transaction.recurrenceType === 'fixed' ||
    transaction.recurrenceType === 'installment' ||
    transaction.isRecurring ||
    transaction.isInstallment
  )
}

export function getNextDueDate(transactions, recurrenceId, fromDate = '') {
  return [...transactions]
    .filter(
      (transaction) =>
        transaction.recurrenceId === recurrenceId &&
        transaction.status !== 'cancelled' &&
        (!fromDate || transaction.date >= fromDate),
    )
    .sort((first, second) => first.date.localeCompare(second.date))[0]?.date
}

export function getCommitmentRows(transactions, selectedMonth) {
  const grouped = transactions
    .filter((transaction) => isRecurringTransaction(transaction))
    .reduce((result, transaction) => {
      const recurrenceId = transaction.recurrenceId || transaction.id

      if (!result[recurrenceId]) {
        result[recurrenceId] = []
      }

      result[recurrenceId].push(transaction)
      return result
    }, {})

  return Object.entries(grouped)
    .map(([recurrenceId, items]) => {
      const orderedItems = [...items].sort((first, second) =>
        first.date.localeCompare(second.date),
      )
      const firstItem = orderedItems[0]
      const activeItems = orderedItems.filter(
        (transaction) =>
          transaction.status !== 'cancelled' && !isBalanceTransaction(transaction),
      )
      const selectedMonthItems = orderedItems.filter(
        (transaction) =>
          transaction.date?.startsWith(selectedMonth) &&
          transaction.status !== 'cancelled',
      )
      const remainingValue = activeItems.reduce(
        (total, transaction) =>
          total + (Number(transaction.convertedAmount) || Number(transaction.amount) || 0),
        0,
      )
      const monthlyValue = selectedMonthItems.reduce(
        (total, transaction) =>
          total + (Number(transaction.convertedAmount) || Number(transaction.amount) || 0),
        0,
      )
      const nextDueDate =
        activeItems.sort((first, second) => first.date.localeCompare(second.date))[0]
          ?.date || orderedItems.at(-1)?.date

      return {
        id: recurrenceId,
        name: firstItem.parentDescription || firstItem.description,
        type: firstItem.recurrenceType || 'fixed',
        transactionType: firstItem.type,
        currency: firstItem.toCurrency,
        monthlyValue,
        remainingValue,
        openCount: activeItems.length,
        paidCount: orderedItems.filter((transaction) => isBalanceTransaction(transaction))
          .length,
        totalCount: orderedItems.length,
        nextDueDate,
        status: activeItems.length > 0 ? 'Ativo' : 'Concluído',
        nextLabel: nextDueDate ? formatDate(nextDueDate) : 'Sem próximo lançamento',
      }
    })
    .sort((first, second) =>
      String(first.nextDueDate || '').localeCompare(String(second.nextDueDate || '')),
    )
}

export function getCommitmentSummary(transactions, selectedMonth) {
  const rows = getCommitmentRows(transactions, selectedMonth)
  const fixedExpenses = rows.filter(
    (row) => row.type === 'fixed' && row.transactionType === 'expense',
  )
  const fixedIncomes = rows.filter(
    (row) => row.type === 'fixed' && row.transactionType === 'income',
  )
  const installments = rows.filter((row) => row.type === 'installment')

  return {
    rows,
    fixedExpensesCount: fixedExpenses.length,
    fixedExpensesMonthlyValue: fixedExpenses.reduce(
      (total, row) => total + row.monthlyValue,
      0,
    ),
    fixedIncomesCount: fixedIncomes.length,
    fixedIncomesMonthlyValue: fixedIncomes.reduce(
      (total, row) => total + row.monthlyValue,
      0,
    ),
    installmentsCount: installments.length,
    installmentsMonthlyValue: installments.reduce(
      (total, row) => total + row.monthlyValue,
      0,
    ),
    installmentsRemainingValue: installments.reduce(
      (total, row) => total + row.remainingValue,
      0,
    ),
    installmentsOpenCount: installments.reduce(
      (total, row) => total + row.openCount,
      0,
    ),
  }
}

export function formatCommitmentSubtitle(row) {
  if (row.type === 'installment') {
    return `${row.openCount} parcelas em aberto • Restante ${formatCurrency(
      row.remainingValue,
      row.currency,
    )}`
  }

  return `${row.transactionType === 'income' ? 'Receita fixa' : 'Despesa fixa'} • ${
    row.nextLabel
  }`
}
