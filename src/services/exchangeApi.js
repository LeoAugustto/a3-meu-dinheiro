import { ensureCurrencyPairDefaults, getCurrencyPair } from '../utils/currency'

export const EXCHANGE_CACHE_KEY = 'meuDinheiro.exchangeRatesCache.v1'

const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR']
const GOOGLE_SHEETS_EXCHANGE_PATH =
  '/macros/s/AKfycbySqXfpmFG4GyAnvhXvBxG9KAEYhyNYnF0kka2FgC3GAX3Wq3bKsP3ffq8cAwxNoIdz/exec'
const GOOGLE_SHEETS_EXCHANGE_URL = `https://script.google.com${GOOGLE_SHEETS_EXCHANGE_PATH}`
const EXCHANGE_ERROR_MESSAGE =
  'Não foi possível buscar cotações em tempo real. Informe uma cotação manual para continuar.'

function getNowIso() {
  return new Date().toISOString()
}

function normalizeExchangeDate(value) {
  if (!value) {
    return ''
  }

  const normalizedValue = String(value)
    .trim()
    .replace(
      /(\d{2}:\d{2}:)(\d)(\s+\+0000)$/u,
      (_, prefix, second, suffix) => `${prefix}0${second}${suffix}`,
    )
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/u.test(normalizedValue)

  if (isDateOnly) {
    return normalizedValue
  }

  const parsedDate = new Date(
    normalizedValue,
  )

  return Number.isNaN(parsedDate.getTime()) ? normalizedValue : parsedDate.toISOString()
}

function getActiveCurrencies(currencies = SUPPORTED_CURRENCIES) {
  const activeCurrencies = currencies.filter((currency) =>
    SUPPORTED_CURRENCIES.includes(currency),
  )

  return activeCurrencies.length > 0 ? activeCurrencies : SUPPORTED_CURRENCIES
}

function shouldUseDevProxy() {
  if (typeof window === 'undefined') {
    return false
  }

  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

function getProviderUrls() {
  if (shouldUseDevProxy()) {
    return {
      googleSheets: `/api/googlefinance${GOOGLE_SHEETS_EXCHANGE_PATH}`,
      exchangeRate: '/api/exchangerate/v6/latest',
      frankfurter: '/api/frankfurter/latest',
    }
  }

  return {
    googleSheets: GOOGLE_SHEETS_EXCHANGE_URL,
    exchangeRate: 'https://open.er-api.com/v6/latest',
    frankfurter: 'https://api.frankfurter.app/latest',
  }
}

function getFriendlyProviderError(error) {
  const message = String(error?.message || '').toLowerCase()

  if (error?.name === 'AbortError' || message.includes('tempo limite')) {
    return 'tempo limite'
  }

  if (message.includes('failed') && message.includes('fetch')) {
    return 'bloqueio de rede ou CORS'
  }

  return error?.message || 'indisponível'
}

function createErrorState(message = EXCHANGE_ERROR_MESSAGE, providers = []) {
  return {
    ok: false,
    status: 'error',
    source: '',
    cachedSource: '',
    detail: '',
    date: '',
    updatedAt: '',
    sourceUpdatedAt: '',
    appUpdatedAt: '',
    fetchedAt: '',
    rates: {},
    error: message,
    warning: '',
    providers,
  }
}

function readCache() {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const cachedValue = localStorage.getItem(EXCHANGE_CACHE_KEY)
    return cachedValue ? JSON.parse(cachedValue) : null
  } catch {
    return null
  }
}

function hasValidRates(rates, currencies = SUPPORTED_CURRENCIES) {
  const activeCurrencies = getActiveCurrencies(currencies)

  return activeCurrencies.every((fromCurrency) =>
    activeCurrencies.every((toCurrency) => {
      const pair = getCurrencyPair(fromCurrency, toCurrency)

      if (fromCurrency === toCurrency) {
        return Number(rates?.[pair]) === 1
      }

      return Number(rates?.[pair]) > 0
    }),
  )
}

function filterRatesByCurrencies(rates, currencies) {
  const activeCurrencies = getActiveCurrencies(currencies)
  const nextRates = {}

  activeCurrencies.forEach((fromCurrency) => {
    activeCurrencies.forEach((toCurrency) => {
      const pair = getCurrencyPair(fromCurrency, toCurrency)
      const value = Number(rates?.[pair])

      if (fromCurrency === toCurrency) {
        nextRates[pair] = 1
      } else if (Number.isFinite(value) && value > 0) {
        nextRates[pair] = value
      }
    })
  })

  return ensureCurrencyPairDefaults(nextRates, activeCurrencies)
}

function normalizeCache(cachedState, currencies = SUPPORTED_CURRENCIES) {
  if (!cachedState?.rates) {
    return null
  }

  const activeCurrencies = getActiveCurrencies(currencies)
  const rates = filterRatesByCurrencies(cachedState.rates, activeCurrencies)

  if (!hasValidRates(rates, activeCurrencies)) {
    return null
  }

  return {
    ok: true,
    status: 'cache',
    source: 'Cache',
    cachedSource: cachedState.cachedSource || cachedState.source || '',
    detail: cachedState.detail || cachedState.cachedDetail || '',
    date: cachedState.sourceUpdatedAt || cachedState.date || '',
    updatedAt: cachedState.appUpdatedAt || cachedState.updatedAt || cachedState.fetchedAt || '',
    sourceUpdatedAt: cachedState.sourceUpdatedAt || cachedState.date || '',
    appUpdatedAt: cachedState.appUpdatedAt || cachedState.updatedAt || cachedState.fetchedAt || '',
    fetchedAt: cachedState.fetchedAt || cachedState.appUpdatedAt || cachedState.updatedAt || '',
    rates,
    error: '',
    warning:
      'Não foi possível atualizar as cotações. Usando a última cotação válida salva.',
  }
}

function writeCache(exchangeState) {
  if (typeof localStorage === 'undefined' || !exchangeState?.ok) {
    return
  }

  try {
    localStorage.setItem(
      EXCHANGE_CACHE_KEY,
      JSON.stringify({
        ok: true,
        status: 'updated',
        source: exchangeState.source,
        detail: exchangeState.detail,
        sourceUpdatedAt: exchangeState.sourceUpdatedAt || exchangeState.date,
        appUpdatedAt: exchangeState.appUpdatedAt || exchangeState.updatedAt,
        fetchedAt: exchangeState.fetchedAt || exchangeState.updatedAt,
        date: exchangeState.sourceUpdatedAt || exchangeState.date,
        updatedAt: exchangeState.appUpdatedAt || exchangeState.updatedAt,
        rates: exchangeState.rates,
      }),
    )
  } catch {
    // Cache is optional. Fresh rates are still returned to the UI.
  }
}

async function requestJson(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tempo limite ao buscar cotações.', { cause: error })
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function createSuccessState({
  source,
  detail = '',
  sourceUpdatedAt = '',
  appUpdatedAt = getNowIso(),
  rates,
  currencies,
}) {
  const activeCurrencies = getActiveCurrencies(currencies)
  const normalizedRates = filterRatesByCurrencies(rates, activeCurrencies)

  if (!hasValidRates(normalizedRates, activeCurrencies)) {
    throw new Error(`${source} não retornou todos os pares necessários.`)
  }

  return {
    ok: true,
    status: 'updated',
    source,
    detail,
    cachedSource: '',
    sourceUpdatedAt: normalizeExchangeDate(sourceUpdatedAt),
    appUpdatedAt: normalizeExchangeDate(appUpdatedAt),
    fetchedAt: normalizeExchangeDate(appUpdatedAt),
    updatedAt: normalizeExchangeDate(appUpdatedAt),
    date: normalizeExchangeDate(sourceUpdatedAt),
    rates: normalizedRates,
    error: '',
    warning: '',
  }
}

async function fetchGoogleSheetsRates(currencies) {
  const urls = getProviderUrls()
  const data = await requestJson(urls.googleSheets, 9000)

  if (!data?.ok || !data.rates) {
    throw new Error(data?.error || 'Resposta inválida')
  }

  return createSuccessState({
    source: data.source || 'Google Sheets / GOOGLEFINANCE',
    detail:
      data.detail ||
      'Cotação obtida de uma planilha Google Sheets usando GOOGLEFINANCE.',
    sourceUpdatedAt: data.updatedAt || data.sourceUpdatedAt || data.fetchedAt,
    rates: data.rates,
    currencies,
  })
}

async function fetchExchangeRateApiRates(currencies) {
  const urls = getProviderUrls()
  const activeCurrencies = getActiveCurrencies(currencies)
  const rates = {}
  let date = ''

  await Promise.all(
    activeCurrencies.map(async (baseCurrency) => {
      const data = await requestJson(`${urls.exchangeRate}/${baseCurrency}`)

      if (data.result && data.result !== 'success') {
        throw new Error(data['error-type'] || 'Resposta inválida')
      }

      rates[getCurrencyPair(baseCurrency, baseCurrency)] = 1
      date = data.time_last_update_utc || data.time_next_update_utc || date

      activeCurrencies
        .filter((currency) => currency !== baseCurrency)
        .forEach((toCurrency) => {
          const rate = Number(data.rates?.[toCurrency])

          if (Number.isFinite(rate) && rate > 0) {
            rates[getCurrencyPair(baseCurrency, toCurrency)] = rate
          }
        })
    }),
  )

  return createSuccessState({
    source: 'ExchangeRate-API',
    detail: 'Cotação obtida pela ExchangeRate-API.',
    sourceUpdatedAt: date,
    rates,
    currencies: activeCurrencies,
  })
}

async function fetchFrankfurterRates(currencies) {
  const urls = getProviderUrls()
  const activeCurrencies = getActiveCurrencies(currencies)
  const rates = {}
  let date = ''

  await Promise.all(
    activeCurrencies.map(async (baseCurrency) => {
      const symbols = activeCurrencies.filter(
        (currency) => currency !== baseCurrency,
      )

      rates[getCurrencyPair(baseCurrency, baseCurrency)] = 1

      if (symbols.length === 0) {
        return
      }

      const params = new URLSearchParams({
        from: baseCurrency,
        to: symbols.join(','),
      })
      const data = await requestJson(`${urls.frankfurter}?${params}`)
      date = data.date || date

      Object.entries(data.rates || {}).forEach(([toCurrency, rate]) => {
        const numericRate = Number(rate)

        if (Number.isFinite(numericRate) && numericRate > 0) {
          rates[getCurrencyPair(baseCurrency, toCurrency)] = numericRate
        }
      })
    }),
  )

  return createSuccessState({
    source: 'Frankfurter',
    detail: 'Cotação diária de referência pela Frankfurter.',
    sourceUpdatedAt: date,
    rates,
    currencies: activeCurrencies,
  })
}

export function getCachedExchangeRates(currencies = SUPPORTED_CURRENCIES) {
  return normalizeCache(readCache(), currencies)
}

export function clearExchangeRatesCache() {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(EXCHANGE_CACHE_KEY)
  } catch {
    // O cache é opcional em navegadores com armazenamento restrito.
  }
}

export function createInitialExchangeState() {
  const cachedState = getCachedExchangeRates()

  if (cachedState) {
    return {
      ...cachedState,
      isLoading: false,
    }
  }

  return {
    ...createErrorState(
      'Nenhuma cotação válida encontrada. Atualize as cotações ou informe uma cotação manual.',
    ),
    isLoading: false,
  }
}

export async function fetchLatestExchangeRates(currencies = SUPPORTED_CURRENCIES) {
  const providerErrors = []
  const providers = [
    ['Google Sheets / GOOGLEFINANCE', fetchGoogleSheetsRates],
    ['ExchangeRate-API', fetchExchangeRateApiRates],
    ['Frankfurter', fetchFrankfurterRates],
  ]

  for (const [providerName, fetchProviderRates] of providers) {
    try {
      const exchangeState = await fetchProviderRates(currencies)
      writeCache(exchangeState)
      return exchangeState
    } catch (error) {
      providerErrors.push({
        provider: providerName,
        error: getFriendlyProviderError(error),
      })
    }
  }

  const cachedState = getCachedExchangeRates(currencies)

  if (cachedState) {
    return {
      ...cachedState,
      providers: providerErrors,
    }
  }

  return createErrorState(EXCHANGE_ERROR_MESSAGE, providerErrors)
}
