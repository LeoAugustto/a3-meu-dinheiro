import { useState } from 'react'
import { AlertCircle, Check, Moon, RefreshCcw, Sun } from 'lucide-react'
import MonthSelector from './MonthSelector'

function HeaderControls({
  selectedMonth,
  setSelectedMonth,
  settings,
  setSettings,
  exchangeState,
  refreshExchangeRates,
  showMonthSelector = true,
  showExchangeRefresh = false,
}) {
  const isDark = settings.theme === 'dark'
  const [refreshStatus, setRefreshStatus] = useState('idle')

  function updateSetting(field, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }))
  }

  async function handleRefreshRates() {
    setRefreshStatus('loading')
    const result = await refreshExchangeRates()
    const success = result?.ok || result?.status === 'updated' || result?.status === 'cache'

    setRefreshStatus(success ? 'success' : 'error')
    window.setTimeout(() => setRefreshStatus('idle'), 2600)
  }

  const refreshTitle =
    refreshStatus === 'success'
      ? 'Cotações atualizadas'
      : refreshStatus === 'error'
        ? 'Não foi possível atualizar as cotações'
        : 'Atualizar cotações'

  return (
    <div className="header-controls">
      {showMonthSelector ? (
        <MonthSelector
          value={selectedMonth}
          onChange={setSelectedMonth}
        />
      ) : null}

      <div className="header-action-buttons">
        <button
          className="icon-button"
          type="button"
          aria-label="Alternar tema"
          title="Alternar tema"
          onClick={() => updateSetting('theme', isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {showExchangeRefresh ? (
          <button
            className={`icon-button exchange-refresh-button is-${refreshStatus}`}
            type="button"
            aria-label="Atualizar cotações"
            title={refreshTitle}
            disabled={exchangeState.isLoading || refreshStatus === 'loading'}
            onClick={handleRefreshRates}
          >
            {refreshStatus === 'success' ? (
              <Check size={18} />
            ) : refreshStatus === 'error' ? (
              <AlertCircle size={18} />
            ) : (
              <RefreshCcw size={18} />
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default HeaderControls
