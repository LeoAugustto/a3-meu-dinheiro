import {
  AlertTriangle,
  CheckCircle2,
  Globe2,
  Percent,
  RefreshCcw,
  Settings2,
  Trash2,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { currencies } from '../data/mockData'
import {
  formatCurrency,
  formatExchangeDate,
  formatRate,
  formatRateWithCurrency,
  getConversionDetails,
} from '../utils/currency'

const exchangeStatusLabels = {
  updated: 'Atualizado',
  cache: 'Última cotação salva',
  error: 'Erro',
  manual: 'Cotação manual',
}

function getSourceDescription(exchangeState) {
  if (exchangeState.status === 'cache') {
    return 'Usando a última cotação válida salva.'
  }

  if (exchangeState.source === 'ExchangeRate-API') {
    return 'Fonte atual usada pelo app.'
  }

  if (exchangeState.source === 'Google Sheets / GOOGLEFINANCE') {
    return exchangeState.detail || 'Cotação obtida por Google Sheets com GOOGLEFINANCE.'
  }

  if (exchangeState.source === 'Frankfurter') {
    return 'Cotação diária de referência.'
  }

  if (exchangeState.status === 'manual') {
    return 'Cotação informada manualmente.'
  }

  return 'Fonte ainda não definida.'
}

function Settings() {
  const {
    settings,
    setSettings,
    exchangeState,
    refreshExchangeRates,
    resetDemoData,
    clearFinancialData,
    clearExchangeRateCache,
  } = useOutletContext()
  const hasRates = Object.keys(exchangeState.rates || {}).length > 0
  const statusLabel =
    exchangeState.isLoading
      ? 'Atualizando'
      : exchangeStatusLabels[exchangeState.status] || exchangeState.status || 'Não definido'
  const isExchangeHealthy =
    hasRates && (exchangeState.status === 'updated' || exchangeState.status === 'cache')
  const exchangeMessage = exchangeState.isLoading
    ? 'Buscando cotações reais nos provedores configurados.'
    : exchangeState.warning ||
      exchangeState.error ||
      (hasRates
        ? 'Cotações disponíveis para conversões automáticas.'
        : 'Nenhuma cotação válida disponível. Use cotação manual até atualizar.')
  const testPairs = [
    ['USD', 'BRL'],
    ['EUR', 'BRL'],
    ['USD', 'EUR'],
  ]
    .map(([fromCurrency, toCurrency]) => {
      if (!hasRates && fromCurrency !== toCurrency) {
        return null
      }

      try {
        return {
          fromCurrency,
          toCurrency,
          details: getConversionDetails({
            amount: 100,
            fromCurrency,
            toCurrency,
            rates: exchangeState.rates,
            source: exchangeState.source,
            rateDate: exchangeState.sourceUpdatedAt || exchangeState.date,
          }),
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)

  function updateSetting(field, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }))
  }

  function toggleCurrency(currency) {
    setSettings((currentSettings) => {
      const alreadyActive = currentSettings.activeCurrencies.includes(currency)
      const activeCurrencies = alreadyActive
        ? currentSettings.activeCurrencies.filter((item) => item !== currency)
        : [...currentSettings.activeCurrencies, currency]
      const safeCurrencies =
        activeCurrencies.length > 0 ? activeCurrencies : [currency]

      return {
        ...currentSettings,
        activeCurrencies: safeCurrencies,
        mainCurrency: safeCurrencies.includes(currentSettings.mainCurrency)
          ? currentSettings.mainCurrency
          : safeCurrencies[0],
      }
    })
  }

  function handleResetDemoData() {
    const shouldReset = window.confirm(
      'Restaurar os dados de demonstração? Os dados atuais serão substituídos.',
    )

    if (shouldReset) {
      resetDemoData()
    }
  }

  function handleClearFinancialData() {
    const shouldClear = window.confirm(
      'Limpar todos os dados financeiros salvos? Esta ação não pode ser desfeita.',
    )

    if (shouldClear) {
      clearFinancialData()
    }
  }

  function handleClearExchangeCache() {
    const shouldClear = window.confirm(
      'Limpar o cache de cotações? A conversão automática precisará buscar novas taxas ou usar cotação manual.',
    )

    if (shouldClear) {
      clearExchangeRateCache()
    }
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Preferências</span>
            <h2>Moeda e cotações</h2>
          </div>
          <Settings2 size={22} />
        </div>

        <div className="settings-form">
          <label className="field">
            <span>Moeda principal</span>
            <select
              aria-label="Moeda principal"
              value={settings.mainCurrency}
              onChange={(event) => updateSetting('mainCurrency', event.target.value)}
            >
              {settings.activeCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-field">
            <input
              type="checkbox"
              checked={settings.useAutomaticRates}
              onChange={(event) =>
                updateSetting('useAutomaticRates', event.target.checked)
              }
            />
            <span>Usar cotação automática pela API</span>
          </label>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Taxas padrão</span>
            <h2>Recebimentos e conversões</h2>
          </div>
          <Percent size={22} />
        </div>

        <div className="settings-form">
          <label className="field">
            <span>Taxa percentual (%)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.internationalPercentageFee}
              onChange={(event) =>
                updateSetting(
                  'internationalPercentageFee',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label className="field">
            <span>Taxa fixa opcional</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.fixedFee}
              onChange={(event) => updateSetting('fixedFee', Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Moedas usadas</span>
            <h2>Carteira do app</h2>
          </div>
          <Globe2 size={22} />
        </div>

        <div className="currency-toggle-grid">
          {currencies.map((currency) => (
            <label className="currency-toggle" key={currency}>
              <input
                type="checkbox"
                checked={settings.activeCurrencies.includes(currency)}
                onChange={() => toggleCurrency(currency)}
              />
              <span>{currency}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel settings-panel span-2 exchange-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Câmbio em tempo real</span>
            <h2>Fonte, cache e última atualização</h2>
          </div>
          <div className="table-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={exchangeState.isLoading}
              onClick={() => refreshExchangeRates()}
            >
              <RefreshCcw size={16} />
              {exchangeState.isLoading ? 'Atualizando...' : 'Atualizar cotações'}
            </button>
            <button
              className="secondary-button danger-text"
              type="button"
              onClick={handleClearExchangeCache}
            >
              <Trash2 size={16} />
              Limpar cache de cotações
            </button>
          </div>
        </div>

        <div
          className={`exchange-alert ${isExchangeHealthy ? 'is-ok' : 'is-warning'}`}
        >
          {isExchangeHealthy ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div>
            <strong>Status: {statusLabel}</strong>
            <span>{exchangeMessage}</span>
          </div>
        </div>

        <div className="exchange-status">
          <span>
            Fonte:{' '}
            <strong>
              {exchangeState.status === 'cache'
                ? exchangeState.cachedSource || 'Última cotação salva'
                : exchangeState.source || 'Não definida'}
            </strong>
          </span>
          <span>
            Detalhe:{' '}
            <strong>{exchangeState.detail || getSourceDescription(exchangeState)}</strong>
          </span>
          <span>
            Cotação da fonte:{' '}
            <strong>
              {formatExchangeDate(exchangeState.sourceUpdatedAt || exchangeState.date)}
            </strong>
          </span>
          <span>
            Atualizado no app:{' '}
            <strong>
              {exchangeState.appUpdatedAt || exchangeState.updatedAt
                ? formatExchangeDate(exchangeState.appUpdatedAt || exchangeState.updatedAt)
                : 'Não atualizada'}
            </strong>
          </span>
        </div>

        <p className="exchange-note">
          As cotações podem variar conforme a fonte, horário e tipo de taxa utilizada.
        </p>

        {hasRates ? (
          <>
            <div className="exchange-test-grid">
              {testPairs.map(({ fromCurrency, toCurrency, details }) => (
                <div className="exchange-test-card" key={`${fromCurrency}-${toCurrency}`}>
                  <span>
                    Exemplo {fromCurrency} → {toCurrency}
                  </span>
                  <strong>
                    {formatCurrency(100, fromCurrency)} ={' '}
                    {formatCurrency(details.finalAmount, toCurrency)}
                  </strong>
                  <small>
                    Cotação usada: {formatRate(details.rate)} • Fonte:{' '}
                    {details.source}
                  </small>
                  <small>Data: {formatExchangeDate(details.rateDate)}</small>
                </div>
              ))}
            </div>

            <div className="rates-grid">
              {Object.entries(exchangeState.rates)
                .filter(([key]) => {
                  const [fromCurrency, toCurrency] = key.split('_')
                  return fromCurrency !== toCurrency
                })
                .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
                .map(([key, rate]) => {
                  const [fromCurrency, toCurrency] = key.split('_')

                  return (
                    <div className="rate-row" key={key}>
                      <Percent size={16} />
                      <span className="rate-pair">
                        <span>{fromCurrency}</span>
                        <span className="rate-arrow" aria-hidden="true">
                          {' → '}
                        </span>
                        <span>{toCurrency}</span>
                      </span>
                      <strong>{formatRateWithCurrency(rate, toCurrency)}</strong>
                    </div>
                  )
                })}
            </div>
          </>
        ) : (
          <p className="empty-state">
            Nenhuma cotação válida em cache. Atualize as cotações ou informe cotação
            manual ao criar a transação.
          </p>
        )}
      </section>

      <section className="panel settings-panel span-2">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Dados locais</span>
            <h2>Dados locais</h2>
          </div>
        </div>

        <div className="settings-actions">
          <button className="secondary-button" type="button" onClick={handleResetDemoData}>
            Restaurar dados de demonstração
          </button>
          <button
            className="secondary-button danger-text"
            type="button"
            onClick={handleClearFinancialData}
          >
            Limpar todos os dados
          </button>
        </div>
      </section>
    </div>
  )
}

export default Settings
