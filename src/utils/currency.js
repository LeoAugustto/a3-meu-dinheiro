import { formatLocalDateTime } from './date'

const ptBrNumberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ptBrRateFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

const currencySymbols = {
  BRL: 'R$',
  USD: 'US$',
  EUR: '€',
}

export function getCurrencyPair(fromCurrency, toCurrency) {
  return `${fromCurrency}_${toCurrency}`
}

export function ensureCurrencyPairDefaults(rates = {}, currencies = ['BRL', 'USD', 'EUR']) {
  const nextRates = { ...rates }

  currencies.forEach((currency) => {
    nextRates[getCurrencyPair(currency, currency)] = 1
  })

  Object.entries({ ...nextRates }).forEach(([pair, value]) => {
    const [fromCurrency, toCurrency] = pair.split('_')
    const numericValue = Number(value)

    if (fromCurrency && toCurrency && numericValue > 0) {
      const inversePair = getCurrencyPair(toCurrency, fromCurrency)

      if (!nextRates[inversePair]) {
        nextRates[inversePair] = 1 / numericValue
      }
    }
  })

  return nextRates
}

export function getExchangeRate({
  fromCurrency,
  toCurrency,
  rates = {},
  manualRate,
}) {
  const numericManualRate = Number(manualRate)

  if (!fromCurrency || !toCurrency) {
    throw new Error('Moedas inválidas para conversão.')
  }

  if (numericManualRate > 0) {
    return numericManualRate
  }

  if (fromCurrency === toCurrency) {
    return 1
  }

  const normalizedRates = ensureCurrencyPairDefaults(rates)
  const directKey = getCurrencyPair(fromCurrency, toCurrency)
  const inverseKey = getCurrencyPair(toCurrency, fromCurrency)

  if (Number(normalizedRates[directKey]) > 0) {
    return Number(normalizedRates[directKey])
  }

  if (Number(normalizedRates[inverseKey]) > 0) {
    return 1 / Number(normalizedRates[inverseKey])
  }

  throw new Error(`Cotação indisponível para ${fromCurrency} -> ${toCurrency}.`)
}

export function getConversionDetails({
  amount,
  fromCurrency,
  toCurrency,
  rates = {},
  percentageFee = 0,
  fixedFee = 0,
  manualRate,
  source = '',
  rateDate = '',
}) {
  const numericAmount = Number(amount)
  const numericPercentageFee = Number(percentageFee) || 0
  const numericFixedFee = Number(fixedFee) || 0
  const numericManualRate = Number(manualRate) || 0

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return {
      rate: 0,
      grossAmount: 0,
      percentageFeeAmount: 0,
      fixedFeeAmount: numericFixedFee,
      finalAmount: 0,
      source,
      rateDate,
      error: 'Informe um valor maior que zero.',
    }
  }

  const rate = getExchangeRate({
    fromCurrency,
    toCurrency,
    rates,
    manualRate,
  })
  const grossAmount = numericAmount * rate
  const percentageFeeAmount = grossAmount * (numericPercentageFee / 100)
  const finalAmount = Math.max(grossAmount - percentageFeeAmount - numericFixedFee, 0)

  return {
    rate,
    grossAmount,
    percentageFeeAmount,
    fixedFeeAmount: numericFixedFee,
    finalAmount,
    source: numericManualRate > 0 ? 'Cotação manual' : source,
    rateDate,
    error: '',
  }
}

export function convertCurrency(options) {
  return getConversionDetails(options).finalAmount
}

export function formatCurrency(value, currency = 'BRL') {
  const numericValue = Number(value) || 0
  const sign = numericValue < 0 ? '-' : ''
  const absoluteValue = Math.abs(numericValue)

  if (currency === 'USD') {
    return `${sign}US$ ${ptBrNumberFormatter.format(absoluteValue)}`
  }

  if (currency === 'EUR') {
    return `${sign}€ ${ptBrNumberFormatter.format(absoluteValue)}`
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  })
    .format(numericValue)
    .replace(/\u00a0/g, ' ')
}

export function formatRate(rate) {
  const numericRate = Number(rate)

  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return 'indisponível'
  }

  return ptBrRateFormatter.format(numericRate)
}

export function formatRateWithCurrency(rate, currency = 'BRL') {
  const formattedRate = formatRate(rate)

  if (formattedRate === 'indisponível') {
    return formattedRate
  }

  return `${currencySymbols[currency] || currency} ${formattedRate}`
}

export function formatExchangeDate(value) {
  return formatLocalDateTime(value)
}

export function formatExchangeSource(source = '', status = '') {
  if (status === 'cache' || source === 'Cache') {
    return 'Última cotação salva'
  }

  if (source === 'ExchangeRate-API') {
    return 'ExchangeRate-API'
  }

  if (source === 'Google Sheets / GOOGLEFINANCE') {
    return 'Google Sheets / GOOGLEFINANCE'
  }

  if (source === 'Frankfurter') {
    return 'Frankfurter'
  }

  if (source === 'Cotação manual') {
    return 'Cotação manual'
  }

  if (source === 'Mesma moeda') {
    return 'Mesma moeda'
  }

  return source || 'Não definida'
}
