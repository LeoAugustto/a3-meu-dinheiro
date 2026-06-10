import { formatCurrency, formatExchangeSource, formatRate } from './currency'

const lockedStatuses = ['confirmed', 'paid']
const previewStatuses = ['pending', 'receivable']

export function isTransactionExchangeLocked(transaction) {
  return transaction.exchangeLocked ?? lockedStatuses.includes(transaction.status)
}

export function getStoredTransactionConversionView(transaction) {
  const locked = isTransactionExchangeLocked(transaction)

  return {
    convertedAmount: Number(transaction.convertedAmount) || 0,
    rate: Number(transaction.rate) || 1,
    source: transaction.exchangeSource || '',
    rateDate: transaction.exchangeDate || transaction.sourceUpdatedAt || '',
    locked,
  }
}

export function getTransactionFeeSummary(transaction, conversionView) {
  const rate = Number(conversionView?.rate || transaction.rate) || 1
  const grossAmount = (Number(transaction.amount) || 0) * rate
  const percentageFeeAmount =
    grossAmount * ((Number(transaction.percentageFee) || 0) / 100)
  const fixedFeeAmount = Number(transaction.fixedFee) || 0
  const totalFee = percentageFeeAmount + fixedFeeAmount

  return {
    grossAmount,
    percentageFeeAmount,
    fixedFeeAmount,
    totalFee,
    hasFee: totalFee > 0,
  }
}

export function getTransactionValueDisplay(
  transaction,
  conversionView = getStoredTransactionConversionView(transaction),
  { sourceStatus = '' } = {},
) {
  const sameCurrency = transaction.fromCurrency === transaction.toCurrency
  const locked = conversionView.locked ?? isTransactionExchangeLocked(transaction)
  const convertedAmount =
    Number(conversionView.convertedAmount ?? transaction.convertedAmount) || 0
  const source = conversionView.source || transaction.exchangeSource || ''
  const rate = Number(conversionView.rate || transaction.rate) || 1
  const statusText =
    transaction.status === 'cancelled'
      ? 'Cancelada'
      : locked
        ? 'Confirmado'
        : previewStatuses.includes(transaction.status)
          ? 'Previsto'
          : 'Previsto'
  const main = sameCurrency
    ? formatCurrency(convertedAmount, transaction.toCurrency)
    : `${formatCurrency(transaction.amount, transaction.fromCurrency)} → ${formatCurrency(
        convertedAmount,
        transaction.toCurrency,
      )}`
  const sourceLabel = formatExchangeSource(source, sourceStatus)
  const statusLine = sameCurrency
    ? statusText
    : `${statusText} · ${locked ? 'Cotação travada' : sourceLabel}`
  const rateLine = sameCurrency
    ? ''
    : `${locked ? 'Cotação' : 'Cotação atual'}: ${formatRate(rate)}`
  const feeSummary = getTransactionFeeSummary(transaction, {
    ...conversionView,
    rate,
  })

  return {
    main,
    statusLine,
    rateLine,
    feeLine: feeSummary.hasFee
      ? `Taxas: ${formatCurrency(feeSummary.totalFee, transaction.toCurrency)}`
      : '',
    finalLine: feeSummary.hasFee
      ? `Final: ${formatCurrency(convertedAmount, transaction.toCurrency)}`
      : '',
    sortValue: convertedAmount,
  }
}

export function formatTransactionValueForCsv(transaction) {
  const display = getTransactionValueDisplay(transaction)

  return [display.main, display.statusLine, display.rateLine, display.feeLine, display.finalLine]
    .filter(Boolean)
    .join(' | ')
}
