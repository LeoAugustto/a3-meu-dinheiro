import { formatCurrency, getExchangeRate } from './currency'

export const balanceStatuses = ['confirmed', 'paid']
export const receivableStatuses = ['pending', 'receivable']
export const statusLabels = {
  active: 'Ativa',
  inactive: 'Inativa',
  confirmed: 'Confirmada',
  pending: 'Pendente',
  receivable: 'A receber',
  paid: 'Paga',
  cancelled: 'Cancelada',
}

export function filterTransactionsByMonth(transactions, selectedMonth) {
  if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
    return []
  }

  return transactions.filter((transaction) =>
    transaction.date?.startsWith(selectedMonth),
  )
}

export function isBalanceTransaction(transaction) {
  return balanceStatuses.includes(transaction.status)
}

export function isReceivableTransaction(transaction) {
  return receivableStatuses.includes(transaction.status)
}

export function getEffectiveConvertedAmount(transaction, rates = {}) {
  const storedAmount = Number(transaction.convertedAmount) || 0
  const exchangeLocked =
    transaction.exchangeLocked ?? isBalanceTransaction(transaction)

  if (
    exchangeLocked ||
    transaction.status === 'cancelled' ||
    !isReceivableTransaction(transaction)
  ) {
    return storedAmount
  }

  const amount = Number(transaction.amount) || 0

  if (amount <= 0) {
    return storedAmount
  }

  try {
    const rate = getExchangeRate({
      fromCurrency: transaction.fromCurrency,
      toCurrency: transaction.toCurrency,
      rates,
      manualRate: transaction.manualRate,
    })
    const grossAmount = amount * rate
    const percentageFeeAmount =
      grossAmount * ((Number(transaction.percentageFee) || 0) / 100)

    return Math.max(
      grossAmount - percentageFeeAmount - (Number(transaction.fixedFee) || 0),
      0,
    )
  } catch {
    return storedAmount
  }
}

export function getMonthSummary(transactions, selectedMonth, rates = {}) {
  const monthTransactions = filterTransactionsByMonth(transactions, selectedMonth)

  return monthTransactions.reduce(
    (summary, transaction) => {
      if (transaction.status === 'cancelled') {
        return summary
      }

      const value = getEffectiveConvertedAmount(transaction, rates)
      const sharedReceivable = Number(transaction.sharedAmountToReceive) || 0

      if (transaction.type === 'income') {
        if (isBalanceTransaction(transaction)) {
          summary.income += value

          if (transaction.fromCurrency !== transaction.toCurrency) {
            summary.foreignIncome += value
          }
        } else if (isReceivableTransaction(transaction)) {
          summary.sharedReceivables += value
        }
      }

      if (transaction.type === 'expense') {
        if (isBalanceTransaction(transaction)) {
          summary.expenses += value
        }

        if (sharedReceivable > 0 && transaction.status !== 'paid') {
          summary.sharedReceivables += sharedReceivable
        }
      }

      summary.balance = summary.income - summary.expenses

      return summary
    },
    {
      income: 0,
      expenses: 0,
      foreignIncome: 0,
      sharedReceivables: 0,
      balance: 0,
    },
  )
}

export function getCategoryTotals(transactions, selectedMonth, type = 'expense') {
  const monthTransactions = filterTransactionsByMonth(transactions, selectedMonth)
  const totalsByCategory = monthTransactions
    .filter(
      (transaction) =>
        transaction.type === type &&
        transaction.status !== 'cancelled' &&
        isBalanceTransaction(transaction),
    )
    .reduce((totals, transaction) => {
      const categoryId = transaction.categoryId || 'cat-other'
      totals[categoryId] =
        (totals[categoryId] || 0) + (Number(transaction.convertedAmount) || 0)
      return totals
    }, {})

  return Object.entries(totalsByCategory)
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((first, second) => second.total - first.total)
}

export function getRecentTransactions(transactions, limit = 5) {
  return [...transactions]
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .slice(0, limit)
}

export function formatDate(date) {
  if (!date) {
    return ''
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

export function formatMonthLabel(month, compact = false) {
  if (!month || !month.includes('-')) {
    return ''
  }

  const [year, monthIndex] = month.split('-')
  const date = new Date(Number(year), Number(monthIndex) - 1, 1)

  const label = new Intl.DateTimeFormat('pt-BR', {
    month: compact ? 'short' : 'long',
    year: 'numeric',
  }).format(date)

  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1)
}

export function addMonths(month, amount) {
  if (!month || !month.includes('-')) {
    return month
  }

  const [year, monthIndex] = month.split('-').map(Number)
  const date = new Date(year, monthIndex - 1 + amount, 1)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')

  return `${nextYear}-${nextMonth}`
}

export function getMonthlyComparison(
  transactions,
  selectedMonth,
  numberOfMonths = 6,
  rates = {},
) {
  const months = Array.from({ length: numberOfMonths }, (_, index) =>
    addMonths(selectedMonth, index - (numberOfMonths - 1)),
  )

  return months.map((month) => {
    const summary = getMonthSummary(transactions, month, rates)

    return {
      month,
      label: formatMonthLabel(month, true),
      income: summary.income,
      expenses: summary.expenses,
      balance: summary.balance,
    }
  })
}

export function applyTransactionFilters(
  transactions,
  filters,
  getCategoryLabel = () => '',
) {
  return transactions.filter((transaction) => {
    const search = String(filters.search || '').trim().toLowerCase()
    const categoryLabel = String(
      getCategoryLabel(transaction.categoryId) || '',
    ).toLowerCase()
    const matchesSearch =
      !search ||
      transaction.description.toLowerCase().includes(search) ||
      categoryLabel.includes(search)
    const matchesType =
      !filters.type || filters.type === 'all' || transaction.type === filters.type
    const matchesCategory =
      !filters.categoryId ||
      filters.categoryId === 'all' ||
      transaction.categoryId === filters.categoryId
    const matchesAccount =
      !filters.accountId ||
      filters.accountId === 'all' ||
      transaction.accountId === filters.accountId
    const matchesCard =
      !filters.cardId ||
      filters.cardId === 'all' ||
      transaction.cardId === filters.cardId
    const matchesCurrency =
      !filters.currency ||
      filters.currency === 'all' ||
      transaction.fromCurrency === filters.currency ||
      transaction.toCurrency === filters.currency
    const matchesStatus =
      !filters.status ||
      filters.status === 'all' ||
      transaction.status === filters.status
    const matchesStartDate =
      !filters.startDate || transaction.date >= filters.startDate
    const matchesEndDate = !filters.endDate || transaction.date <= filters.endDate

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesAccount &&
      matchesCard &&
      matchesCurrency &&
      matchesStatus &&
      matchesStartDate &&
      matchesEndDate
    )
  })
}

export function calculateAccountBalances(accounts, transactions) {
  return accounts.map((account) => {
    const currentBalance = transactions.reduce((balance, transaction) => {
      if (
        transaction.accountId !== account.id ||
        !isBalanceTransaction(transaction) ||
        transaction.status === 'cancelled'
      ) {
        return balance
      }

      const value = Number(transaction.convertedAmount) || 0

      return transaction.type === 'income' ? balance + value : balance - value
    }, Number(account.initialBalance) || 0)

    return {
      ...account,
      currentBalance,
    }
  })
}

export function calculateCardUsage(cards, transactions) {
  return cards.map((card) => {
    const currentBill = transactions.reduce((total, transaction) => {
      if (
        transaction.cardId !== card.id ||
        transaction.type !== 'expense' ||
        transaction.status === 'cancelled' ||
        !isBalanceTransaction(transaction)
      ) {
        return total
      }

      return total + (Number(transaction.convertedAmount) || 0)
    }, Number(card.used) || 0)
    const usagePercent =
      Number(card.limit) > 0 ? Math.min((currentBill / Number(card.limit)) * 100, 100) : 0

    return {
      ...card,
      currentBill,
      usagePercent,
    }
  })
}

export function getConsolidatedBalance(accountsWithBalances, mainCurrency, rates) {
  return accountsWithBalances.reduce((total, account) => {
    const value = Number(account.currentBalance) || 0

    if (account.currency === mainCurrency) {
      return total + value
    }

    try {
      const rate = getExchangeRate({
        fromCurrency: account.currency,
        toCurrency: mainCurrency,
        rates,
      })

      return total + value * rate
    } catch {
      return total
    }
  }, 0)
}

export function groupTransactionsByAccount(transactions, accounts) {
  return accounts.map((account) => {
    const total = transactions
      .filter((transaction) => transaction.accountId === account.id)
      .reduce((sum, transaction) => sum + (Number(transaction.convertedAmount) || 0), 0)

    return {
      id: account.id,
      name: account.name,
      total,
      currency: account.currency,
    }
  })
}

export function groupTransactionsByCard(transactions, cards) {
  return cards.map((card) => {
    const total = transactions
      .filter((transaction) => transaction.cardId === card.id)
      .reduce((sum, transaction) => sum + (Number(transaction.convertedAmount) || 0), 0)

    return {
      id: card.id,
      name: card.name,
      total,
    }
  })
}

export function getFeesTotal(transactions) {
  return transactions.reduce((total, transaction) => {
    if (!isBalanceTransaction(transaction) || transaction.status === 'cancelled') {
      return total
    }

    const grossAmount =
      (Number(transaction.amount) || 0) * (Number(transaction.rate) || 1)
    const percentageFeeAmount =
      grossAmount * ((Number(transaction.percentageFee) || 0) / 100)

    return total + percentageFeeAmount + (Number(transaction.fixedFee) || 0)
  }, 0)
}

export function getEmptyLabel(value, currency = 'BRL') {
  return formatCurrency(Number(value) || 0, currency)
}
