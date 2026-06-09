import { useCallback, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Calculator,
  CheckCircle2,
  Edit3,
  HandCoins,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import CollapsibleFilters from '../components/CollapsibleFilters'
import { currencies } from '../data/mockData'
import {
  formatCurrency,
  formatExchangeDate,
  formatExchangeSource,
  formatRate,
  getConversionDetails,
} from '../utils/currency'
import {
  applyTransactionFilters,
  filterTransactionsByMonth,
  formatDate,
  statusLabels,
} from '../utils/finance'

const emptyFilters = {
  search: '',
  type: 'all',
  categoryId: 'all',
  accountId: 'all',
  cardId: 'all',
  currency: 'all',
  status: 'all',
  startDate: '',
  endDate: '',
}

const lockedStatuses = ['confirmed', 'paid']
const openReceivableStatuses = ['pending', 'receivable']

function hasLockedExchange(transaction) {
  return transaction.exchangeLocked ?? lockedStatuses.includes(transaction.status)
}

function getExchangeDateFromState(exchangeState) {
  return exchangeState.sourceUpdatedAt || exchangeState.date || ''
}

function getExchangeSourceDetail(transaction, exchangeState, source) {
  if (source === 'Cotação manual') {
    return 'Cotação informada manualmente.'
  }

  if (transaction.fromCurrency === transaction.toCurrency) {
    return 'Sem conversão entre moedas.'
  }

  return exchangeState.detail || ''
}

function getTodayInputValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createEmptyForm(settings, accounts) {
  const account = accounts[0]

  return {
    description: '',
    type: 'income',
    amount: '',
    fromCurrency: account?.currency || settings.mainCurrency,
    toCurrency: account?.currency || settings.mainCurrency,
    accountId: account?.id || '',
    cardId: '',
    categoryId: '',
    date: getTodayInputValue(),
    percentageFee: settings.internationalPercentageFee,
    fixedFee: settings.fixedFee,
    manualRate: '',
    useAutomaticRate: settings.useAutomaticRates,
    shared: false,
    sharedAmountToReceive: '',
    status: 'confirmed',
  }
}

function createFormFromTransaction(transaction) {
  return {
    description: transaction.description,
    type: transaction.type,
    amount: String(transaction.amount),
    fromCurrency: transaction.fromCurrency,
    toCurrency: transaction.toCurrency,
    accountId: transaction.accountId,
    cardId: transaction.cardId || '',
    categoryId: transaction.categoryId,
    date: transaction.date,
    percentageFee: String(transaction.percentageFee || 0),
    fixedFee: String(transaction.fixedFee || 0),
    manualRate: String(transaction.manualRate || ''),
    useAutomaticRate: transaction.useAutomaticRate ?? true,
    shared: Boolean(transaction.shared),
    sharedAmountToReceive: String(transaction.sharedAmountToReceive || ''),
    status: transaction.status || 'confirmed',
  }
}

function getFriendlyConversionError(error) {
  if (!error) {
    return ''
  }

  const normalizedError = String(error).toLowerCase()

  if (normalizedError.includes('valor maior que zero')) {
    return 'Informe um valor maior que zero para calcular a conversão.'
  }

  if (normalizedError.includes('cotação indisponível')) {
    return 'Cotação automática indisponível. Informe uma cotação manual para continuar.'
  }

  return 'Não foi possível calcular a conversão. Revise o valor, as moedas e a cotação informada.'
}

function Transactions() {
  const {
    transactions,
    setTransactions,
    accounts,
    categories,
    cards,
    settings,
    exchangeState,
    selectedMonth,
  } = useOutletContext()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm(settings, accounts))
  const [filters, setFilters] = useState(emptyFilters)
  const [areFiltersOpen, setAreFiltersOpen] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const getCategoryLabel = useCallback(
    (categoryId) =>
      categories.find((category) => category.id === categoryId)?.name || 'Outros',
    [categories],
  )

  function getAccount(accountId) {
    return accounts.find((account) => account.id === accountId)
  }

  const filteredTransactions = useMemo(
    () =>
      applyTransactionFilters(
        filterTransactionsByMonth(transactions, selectedMonth),
        filters,
        getCategoryLabel,
      ),
    [transactions, selectedMonth, filters, getCategoryLabel],
  )

  const selectedAccount = getAccount(form.accountId)
  const automaticRatesAvailable =
    form.useAutomaticRate &&
    exchangeState.ok &&
    Object.keys(exchangeState.rates || {}).length > 0
  const amountValue = Number(form.amount)
  const hasValidAmount = Number.isFinite(amountValue) && amountValue > 0
  const needsConversion = form.fromCurrency !== form.toCurrency
  const hasManualRate = Number(form.manualRate) > 0

  const conversionPreview = useMemo(() => {
    try {
      return getConversionDetails({
        amount: form.amount,
        fromCurrency: form.fromCurrency,
        toCurrency: form.toCurrency,
        rates: automaticRatesAvailable ? exchangeState.rates : {},
        percentageFee: form.percentageFee,
        fixedFee: form.fixedFee,
        manualRate: form.manualRate,
        source: hasManualRate
          ? 'Cotação manual'
          : form.fromCurrency === form.toCurrency
            ? 'Mesma moeda'
            : exchangeState.source || 'Cotação automática indisponível',
        rateDate: hasManualRate ? '' : getExchangeDateFromState(exchangeState),
      })
    } catch (previewError) {
      return {
        rate: 0,
        grossAmount: 0,
        percentageFeeAmount: 0,
        fixedFeeAmount: Number(form.fixedFee) || 0,
        finalAmount: 0,
        source: exchangeState.source,
        rateDate: getExchangeDateFromState(exchangeState),
        error: previewError.message,
      }
    }
  }, [form, hasManualRate, automaticRatesAvailable, exchangeState])
  const friendlyPreviewError = getFriendlyConversionError(conversionPreview.error)
  const shouldShowRateUnavailable =
    hasValidAmount &&
    needsConversion &&
    !hasManualRate &&
    (friendlyPreviewError ||
      !form.useAutomaticRate ||
      (form.useAutomaticRate && !automaticRatesAvailable))
  const shouldShowConversionDetails = hasValidAmount && !shouldShowRateUnavailable
  const previewSource = formatExchangeSource(
    conversionPreview.source,
    hasManualRate ? 'manual' : exchangeState.status,
  )

  function getDynamicConversionDetails(transaction) {
    const sameCurrency = transaction.fromCurrency === transaction.toCurrency
    const usesManualRate = Number(transaction.manualRate) > 0
    const source = usesManualRate
      ? 'Cotação manual'
      : sameCurrency
        ? 'Mesma moeda'
        : exchangeState.source || transaction.exchangeSource || ''

    return getConversionDetails({
      amount: transaction.amount,
      fromCurrency: transaction.fromCurrency,
      toCurrency: transaction.toCurrency,
      rates: exchangeState.ok ? exchangeState.rates : {},
      percentageFee: transaction.percentageFee,
      fixedFee: transaction.fixedFee,
      manualRate: transaction.manualRate,
      source,
      rateDate: sameCurrency || usesManualRate ? '' : getExchangeDateFromState(exchangeState),
    })
  }

  function getTransactionConversionView(transaction) {
    const locked = hasLockedExchange(transaction)

    if (!locked && transaction.status !== 'cancelled') {
      try {
        const details = getDynamicConversionDetails(transaction)

        return {
          convertedAmount: details.finalAmount,
          rate: details.rate,
          source: details.source,
          rateDate: details.rateDate,
          valueLabel: 'Valor previsto',
          exchangeLabel: 'Cotação atual',
          locked: false,
        }
      } catch {
        return {
          convertedAmount: transaction.convertedAmount,
          rate: transaction.rate,
          source: transaction.exchangeSource,
          rateDate: transaction.exchangeDate || transaction.sourceUpdatedAt,
          valueLabel: 'Valor previsto',
          exchangeLabel: 'Cotação atual indisponível',
          locked: false,
        }
      }
    }

    return {
      convertedAmount: transaction.convertedAmount,
      rate: transaction.rate,
      source: transaction.exchangeSource,
      rateDate: transaction.exchangeDate || transaction.sourceUpdatedAt,
      valueLabel: locked ? 'Valor confirmado' : 'Valor salvo',
      exchangeLabel: locked ? 'Cotação travada' : 'Cotação atual',
      locked,
    }
  }

  function buildLockedTransaction(transaction, nextStatus = 'confirmed', overrides = {}) {
    const details = getDynamicConversionDetails(transaction)
    const source =
      transaction.fromCurrency === transaction.toCurrency ? 'Mesma moeda' : details.source
    const now = new Date().toISOString()

    return {
      ...transaction,
      ...overrides,
      status: nextStatus,
      convertedAmount: details.finalAmount,
      rate: details.rate,
      exchangeSource: source,
      exchangeDetail: getExchangeSourceDetail(transaction, exchangeState, source),
      exchangeDate: details.rateDate,
      sourceUpdatedAt: details.rateDate,
      confirmedAt: now,
      exchangeLocked: true,
    }
  }

  function handleConfirmTransaction(transaction, successMessage) {
    try {
      const lockedTransaction = buildLockedTransaction(transaction)

      setTransactions((currentTransactions) =>
        currentTransactions.map((item) =>
          item.id === transaction.id ? lockedTransaction : item,
        ),
      )
      setError('')
      setFeedback(successMessage)
    } catch {
      setError(
        'Não foi possível confirmar a transação. Atualize as cotações ou informe uma cotação manual.',
      )
    }
  }

  function handleMarkSharedReceived(transaction) {
    const receivedAmount = Number(transaction.sharedAmountToReceive) || 0

    if (receivedAmount <= 0) {
      return
    }

    try {
      const lockedExpense = buildLockedTransaction(transaction, 'confirmed', {
        shared: false,
        sharedAmountToReceive: 0,
      })
      const now = new Date().toISOString()
      const incomeCategory =
        categories.find((category) => category.id === 'cat-other')?.id ||
        categories.find(
          (category) => category.type === 'income' || category.type === 'both',
        )?.id ||
        transaction.categoryId
      const reimbursementTransaction = {
        id: `txn-${Date.now()}-shared`,
        description: `Recebimento de ${transaction.description}`,
        type: 'income',
        amount: receivedAmount,
        fromCurrency: transaction.toCurrency,
        toCurrency: transaction.toCurrency,
        convertedAmount: receivedAmount,
        accountId: transaction.accountId,
        cardId: '',
        categoryId: incomeCategory,
        date: getTodayInputValue(),
        percentageFee: 0,
        fixedFee: 0,
        manualRate: '',
        rate: 1,
        useAutomaticRate: false,
        shared: false,
        sharedAmountToReceive: 0,
        status: 'confirmed',
        exchangeSource: 'Mesma moeda',
        exchangeDetail: 'Recebimento de conta compartilhada.',
        exchangeDate: '',
        sourceUpdatedAt: '',
        confirmedAt: now,
        exchangeLocked: true,
      }

      setTransactions((currentTransactions) => [
        reimbursementTransaction,
        ...currentTransactions.map((item) =>
          item.id === transaction.id ? lockedExpense : item,
        ),
      ])
      setError('')
      setFeedback('Valor compartilhado marcado como recebido.')
    } catch {
      setError(
        'Não foi possível registrar o recebimento. Atualize as cotações ou informe uma cotação manual.',
      )
    }
  }

  function updateField(field, value) {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [field]: value }

      if (field === 'accountId') {
        const account = getAccount(value)
        nextForm.toCurrency = account?.currency || nextForm.toCurrency
      }

      if (field === 'type' && value === 'income') {
        nextForm.cardId = ''
        nextForm.shared = false
        nextForm.sharedAmountToReceive = ''
      }

      if (field === 'shared') {
        nextForm.status = 'confirmed'
      }

      return nextForm
    })
  }

  function updateFilter(field, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
  }

  function resetForm() {
    setForm(createEmptyForm(settings, accounts))
    setEditingId(null)
    setIsFormOpen(false)
    setError('')
    setFeedback('')
  }

  function openCreateForm() {
    setForm(createEmptyForm(settings, accounts))
    setEditingId(null)
    setIsFormOpen(true)
    setError('')
    setFeedback('')
  }

  function openEditForm(transaction) {
    setForm(createFormFromTransaction(transaction))
    setEditingId(transaction.id)
    setIsFormOpen(true)
    setError('')
    setFeedback('')
  }

  function validateForm() {
    if (!form.description.trim()) return 'Informe a descrição.'
    if (Number(form.amount) <= 0) return 'Informe um valor maior que zero.'
    if (!form.accountId) return 'Selecione uma conta.'
    if (!form.categoryId) return 'Selecione uma categoria.'
    if (conversionPreview.error) {
      return getFriendlyConversionError(conversionPreview.error)
    }
    return ''
  }

  function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    const currentTransaction = transactions.find(
      (transaction) => transaction.id === editingId,
    )
    const finalStatus = form.type === 'expense' && form.shared ? 'confirmed' : form.status
    const shouldLockExchange = lockedStatuses.includes(finalStatus)
    const exchangeSource =
      form.fromCurrency === form.toCurrency ? 'Mesma moeda' : conversionPreview.source
    const exchangeDetail = getExchangeSourceDetail(form, exchangeState, exchangeSource)
    const nextTransaction = {
      id: editingId || `txn-${Date.now()}`,
      description: form.description.trim(),
      type: form.type,
      amount: Number(form.amount) || 0,
      fromCurrency: form.fromCurrency,
      toCurrency: form.toCurrency,
      convertedAmount: conversionPreview.finalAmount,
      accountId: form.accountId,
      cardId: form.type === 'expense' ? form.cardId : '',
      categoryId: form.categoryId,
      date: form.date,
      percentageFee: Number(form.percentageFee) || 0,
      fixedFee: Number(form.fixedFee) || 0,
      manualRate: form.manualRate,
      rate: conversionPreview.rate,
      useAutomaticRate: form.useAutomaticRate,
      status: finalStatus,
      shared: form.type === 'expense' ? form.shared : false,
      sharedAmountToReceive:
        form.type === 'expense' && form.shared
          ? Number(form.sharedAmountToReceive) || 0
          : 0,
      exchangeSource,
      exchangeDetail,
      exchangeDate: conversionPreview.rateDate,
      sourceUpdatedAt: conversionPreview.rateDate,
      confirmedAt: shouldLockExchange ? currentTransaction?.confirmedAt || new Date().toISOString() : '',
      exchangeLocked: shouldLockExchange,
    }

    setTransactions((currentTransactions) => {
      if (editingId) {
        return currentTransactions.map((transaction) =>
          transaction.id === editingId ? nextTransaction : transaction,
        )
      }

      return [nextTransaction, ...currentTransactions]
    })

    const successMessage = editingId
      ? 'Transação atualizada com sucesso.'
      : 'Transação salva com sucesso.'
    resetForm()
    setFeedback(successMessage)
  }

  function handleDelete(transactionId) {
    const shouldDelete = window.confirm('Deseja excluir esta transação?')

    if (!shouldDelete) {
      return
    }

    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.id !== transactionId),
    )
    setFeedback('Transação excluída com sucesso.')
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{filteredTransactions.length} transações</strong>
          <span>Transações integradas com contas, cartões e câmbio.</span>
        </div>
        <button
          className="primary-button compact"
          type="button"
          onClick={() => (isFormOpen ? resetForm() : openCreateForm())}
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'Fechar' : 'Nova transação'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}

      <CollapsibleFilters
        title="Filtros de transações"
        subtitle="Buscar, conta, categoria, moeda e status"
        isOpen={areFiltersOpen}
        onToggle={() => setAreFiltersOpen((currentValue) => !currentValue)}
      >
        <div className="filters-grid">
          <label className="field span-2">
            <span>Buscar</span>
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Descrição ou categoria"
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="all">Todos</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </label>
          <label className="field">
            <span>Conta</span>
            <select value={filters.accountId} onChange={(event) => updateFilter('accountId', event.target.value)}>
              <option value="all">Todas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Categoria</span>
            <select value={filters.categoryId} onChange={(event) => updateFilter('categoryId', event.target.value)}>
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Cartão</span>
            <select value={filters.cardId} onChange={(event) => updateFilter('cardId', event.target.value)}>
              <option value="all">Todos</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>{card.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Moeda</span>
            <select value={filters.currency} onChange={(event) => updateFilter('currency', event.target.value)}>
              <option value="all">Todas</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="all">Todos</option>
              <option value="confirmed">{statusLabels.confirmed}</option>
              <option value="pending">{statusLabels.pending}</option>
              <option value="receivable">{statusLabels.receivable}</option>
              <option value="paid">{statusLabels.paid}</option>
              <option value="cancelled">{statusLabels.cancelled}</option>
            </select>
          </label>
          <label className="field">
            <span>Data inicial</span>
            <input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} />
          </label>
          <label className="field">
            <span>Data final</span>
            <input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} />
          </label>
          <button className="secondary-button filter-reset" type="button" onClick={() => setFilters(emptyFilters)}>
            Limpar filtros
          </button>
        </div>
      </CollapsibleFilters>

      {isFormOpen ? (
        <section className="panel transaction-form-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cadastro</span>
              <h2>{editingId ? 'Editar transação' : 'Nova transação'}</h2>
            </div>
            <Calculator size={22} />
          </div>

          <form className="transaction-form" onSubmit={handleSubmit}>
            <label className="field span-2">
              <span>Descrição</span>
              <input
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Ex.: Pagamento de serviço"
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select value={form.type} onChange={(event) => updateField('type', event.target.value)}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </label>
            <label className="field">
              <span>Conta</span>
              <select value={form.accountId} onChange={(event) => updateField('accountId', event.target.value)}>
                <option value="">Selecione</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} />
            </label>
            <label className="field">
              <span>Moeda de origem</span>
              <select value={form.fromCurrency} onChange={(event) => updateField('fromCurrency', event.target.value)}>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Moeda da conta</span>
              <select value={form.toCurrency} onChange={(event) => updateField('toCurrency', event.target.value)}>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Categoria</span>
              <select value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)}>
                <option value="">Selecione</option>
                {categories
                  .filter((category) => category.type === form.type || category.type === 'both')
                  .map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Cartão</span>
              <select
                value={form.cardId}
                disabled={form.type !== 'expense'}
                onChange={(event) => updateField('cardId', event.target.value)}
              >
                <option value="">Sem cartão</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{card.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Data</span>
              <input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} disabled={form.shared} onChange={(event) => updateField('status', event.target.value)}>
                <option value="confirmed">{statusLabels.confirmed}</option>
                <option value="pending">{statusLabels.pending}</option>
                <option value="receivable">{statusLabels.receivable}</option>
                <option value="paid">{statusLabels.paid}</option>
                <option value="cancelled">{statusLabels.cancelled}</option>
              </select>
            </label>
            <label className="field">
              <span>Taxa percentual (%)</span>
              <input type="number" min="0" step="0.01" value={form.percentageFee} onChange={(event) => updateField('percentageFee', event.target.value)} />
            </label>
            <label className="field">
              <span>Taxa/desconto fixo</span>
              <input type="number" min="0" step="0.01" value={form.fixedFee} onChange={(event) => updateField('fixedFee', event.target.value)} />
            </label>
            <label className="field">
              <span>Cotação manual</span>
              <input type="number" min="0" step="0.0001" value={form.manualRate} onChange={(event) => updateField('manualRate', event.target.value)} placeholder="Opcional" />
            </label>
            <label className="toggle-field">
              <input type="checkbox" checked={form.useAutomaticRate} onChange={(event) => updateField('useAutomaticRate', event.target.checked)} />
              <span>Usar cotação automática</span>
            </label>
            {form.type === 'expense' ? (
              <label className="toggle-field">
                <input type="checkbox" checked={form.shared} onChange={(event) => updateField('shared', event.target.checked)} />
                <span>Conta dividida com valor a receber</span>
              </label>
            ) : null}
            {form.type === 'expense' && form.shared ? (
              <label className="field">
                <span>Valor a receber</span>
                <input type="number" min="0" step="0.01" value={form.sharedAmountToReceive} onChange={(event) => updateField('sharedAmountToReceive', event.target.value)} />
              </label>
            ) : null}

            <div className="conversion-preview conversion-preview-card conversion-preview-wide">
              <div className="conversion-preview-header">
                <span>Prévia da conversão</span>
                {shouldShowConversionDetails ? (
                  <strong>
                    {formatCurrency(conversionPreview.finalAmount, form.toCurrency)}
                  </strong>
                ) : null}
              </div>

              {!hasValidAmount ? (
                <small className="preview-message">
                  Informe um valor maior que zero para calcular a conversão.
                </small>
              ) : shouldShowRateUnavailable ? (
                <small className="error-text">
                  Cotação automática indisponível. Informe uma cotação manual para continuar.
                </small>
              ) : (
                <>
                  <div className="conversion-preview-grid">
                    <small>Cotação usada: {formatRate(conversionPreview.rate)}</small>
                    <small>Fonte: {previewSource}</small>
                    {!hasManualRate && conversionPreview.rateDate ? (
                      <small>
                        Data da cotação: {formatExchangeDate(conversionPreview.rateDate)}
                      </small>
                    ) : null}
                    <small>
                      Bruto convertido:{' '}
                      {formatCurrency(conversionPreview.grossAmount, form.toCurrency)}
                    </small>
                    <small>
                      Taxa percentual:{' '}
                      {formatCurrency(
                        conversionPreview.percentageFeeAmount,
                        form.toCurrency,
                      )}
                    </small>
                    <small>
                      Taxa fixa:{' '}
                      {formatCurrency(conversionPreview.fixedFeeAmount, form.toCurrency)}
                    </small>
                    <small>
                      Valor final:{' '}
                      {formatCurrency(conversionPreview.finalAmount, form.toCurrency)}
                    </small>
                  </div>
                  {friendlyPreviewError ? (
                    <small className="error-text">{friendlyPreviewError}</small>
                  ) : null}
                </>
              )}
            </div>

            <div className="form-footer span-2">
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                {editingId ? 'Atualizar transação' : 'Salvar transação'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel table-panel">
        <div className="responsive-table">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Conta</th>
                <th>Valor original</th>
                <th>Convertido</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const account = accounts.find((item) => item.id === transaction.accountId)
                const conversionView = getTransactionConversionView(transaction)
                const sharedAmountToReceive =
                  Number(transaction.sharedAmountToReceive) || 0
                return (
                  <tr key={transaction.id}>
                    <td data-label="Descrição">
                      <strong>{transaction.description}</strong>
                      {transaction.shared && sharedAmountToReceive > 0 ? (
                        <small className="shared-note">
                          <HandCoins size={14} />
                          A receber {formatCurrency(sharedAmountToReceive, transaction.toCurrency)}
                        </small>
                      ) : null}
                    </td>
                    <td data-label="Tipo">
                      <span className={`status-pill ${transaction.type}`}>
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td data-label="Conta">{account?.name || 'Conta removida'}</td>
                    <td data-label="Valor original">
                      {formatCurrency(transaction.amount, transaction.fromCurrency)}
                      <small>{transaction.fromCurrency}</small>
                    </td>
                    <td data-label="Convertido">
                      {formatCurrency(conversionView.convertedAmount, transaction.toCurrency)}
                      <small>
                        {transaction.toCurrency} • {conversionView.valueLabel}
                      </small>
                      <small>
                        {conversionView.exchangeLabel}: {formatRate(conversionView.rate)} •{' '}
                        {formatExchangeSource(
                          conversionView.source,
                          conversionView.locked ? 'updated' : exchangeState.status,
                        )}
                      </small>
                    </td>
                    <td data-label="Categoria">{getCategoryLabel(transaction.categoryId)}</td>
                    <td data-label="Data">{formatDate(transaction.date)}</td>
                    <td data-label="Status">
                      <span className="soft-pill">
                        {statusLabels[transaction.status] || transaction.status}
                      </span>
                    </td>
                    <td data-label="Ações">
                      <div className="table-actions">
                        {transaction.type === 'income' &&
                        openReceivableStatuses.includes(transaction.status) ? (
                          <button
                            className="secondary-button compact-action"
                            type="button"
                            onClick={() =>
                              handleConfirmTransaction(
                                transaction,
                                'Recebimento confirmado.',
                              )
                            }
                          >
                            <CheckCircle2 size={15} />
                            Confirmar recebimento
                          </button>
                        ) : null}
                        {transaction.type === 'expense' &&
                        transaction.status === 'pending' ? (
                          <button
                            className="secondary-button compact-action"
                            type="button"
                            onClick={() =>
                              handleConfirmTransaction(
                                transaction,
                                'Despesa confirmada.',
                              )
                            }
                          >
                            <CheckCircle2 size={15} />
                            Confirmar despesa
                          </button>
                        ) : null}
                        {transaction.type === 'expense' &&
                        sharedAmountToReceive > 0 &&
                        transaction.status !== 'cancelled' ? (
                          <button
                            className="secondary-button compact-action"
                            type="button"
                            onClick={() => handleMarkSharedReceived(transaction)}
                          >
                            <HandCoins size={15} />
                            Marcar recebido
                          </button>
                        ) : null}
                        <button className="icon-button" type="button" aria-label="Editar" onClick={() => openEditForm(transaction)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="icon-button danger" type="button" aria-label="Excluir" onClick={() => handleDelete(transaction.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="empty-state">Nenhuma transação encontrada com os filtros atuais.</p>
        ) : null}
      </section>
      {!selectedAccount && isFormOpen ? (
        <p className="form-error">Cadastre uma conta antes de lançar transações.</p>
      ) : null}
    </div>
  )
}

export default Transactions
