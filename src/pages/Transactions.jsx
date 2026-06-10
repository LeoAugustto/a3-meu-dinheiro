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
import DatePicker from '../components/DatePicker'
import SortButton from '../components/SortButton'
import SortControls from '../components/SortControls'
import { currencies } from '../data/mockData'
import { useSortableData } from '../hooks/useSortableData'
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
import {
  addMonthsToDate,
  getDateWithDay,
  getScopeFromPrompt,
  isRecurringTransaction,
  recurrenceTypeLabels,
} from '../utils/recurrences'

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
    recurrenceType: 'none',
    repeatDay: new Date().getDate(),
    recurrenceStartDate: getTodayInputValue(),
    recurrenceEndDate: '',
    recurrenceInitialStatus: 'pending',
    installmentCount: 1,
    installmentStartNumber: 1,
    installmentAmountMode: 'total',
    installmentFirstDate: getTodayInputValue(),
    installmentInitialStatus: 'pending',
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
    recurrenceType: transaction.recurrenceType || 'none',
    repeatDay: String(transaction.repeatDay || new Date().getDate()),
    recurrenceStartDate: transaction.startDate || transaction.date,
    recurrenceEndDate: transaction.endDate || '',
    recurrenceInitialStatus: transaction.status || 'pending',
    installmentCount: String(transaction.installmentTotal || 1),
    installmentStartNumber: String(transaction.installmentNumber || 1),
    installmentAmountMode: 'installment',
    installmentFirstDate: transaction.date,
    installmentInitialStatus: transaction.status || 'pending',
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

  const transactionSortOptions = [
    {
      key: 'description',
      label: 'Descrição',
      getValue: (transaction) => transaction.description,
    },
    {
      key: 'type',
      label: 'Tipo',
      getValue: (transaction) => transaction.type,
    },
    {
      key: 'account',
      label: 'Conta',
      getValue: (transaction) =>
        accounts.find((account) => account.id === transaction.accountId)?.name ||
        '',
    },
    {
      key: 'card',
      label: 'Cartão',
      getValue: (transaction) =>
        cards.find((card) => card.id === transaction.cardId)?.name || '',
    },
    {
      key: 'amount',
      label: 'Valor original',
      getValue: (transaction) => Number(transaction.amount) || 0,
    },
    {
      key: 'converted',
      label: 'Convertido',
      getValue: (transaction) =>
        Number(getTransactionConversionView(transaction).convertedAmount) || 0,
    },
    {
      key: 'category',
      label: 'Categoria',
      getValue: (transaction) => getCategoryLabel(transaction.categoryId),
    },
    {
      key: 'date',
      label: 'Data',
      getValue: (transaction) => transaction.date,
    },
    {
      key: 'status',
      label: 'Status',
      getValue: (transaction) => statusLabels[transaction.status] || transaction.status,
    },
  ]
  const {
    sortedItems: sortedTransactions,
    sortConfig: transactionSortConfig,
    requestSort: requestTransactionSort,
    updateSort: updateTransactionSort,
  } = useSortableData(filteredTransactions, transactionSortOptions, {
    key: 'date',
    direction: 'desc',
  })

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
    if (form.recurrenceType === 'fixed') {
      if (!form.recurrenceStartDate) return 'Informe a data inicial da recorrência.'
      if (Number(form.repeatDay) < 1 || Number(form.repeatDay) > 31) {
        return 'Informe um dia do mês entre 1 e 31.'
      }
    }
    if (form.recurrenceType === 'installment') {
      if (!form.installmentFirstDate) return 'Informe a data da primeira parcela.'
      if (Number(form.installmentCount) <= 1) {
        return 'Informe pelo menos 2 parcelas.'
      }
    }
    if (conversionPreview.error) {
      return getFriendlyConversionError(conversionPreview.error)
    }
    return ''
  }

  function getConversionForAmount(amount) {
    return getConversionDetails({
      amount,
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
  }

  function getBaseTransaction({
    id,
    description,
    amount,
    date,
    status,
    recurrenceMeta = {},
    currentTransaction,
  }) {
    const details = getConversionForAmount(amount)
    const finalStatus = form.type === 'expense' && form.shared ? 'confirmed' : form.status
    const appliedStatus = status || finalStatus
    const shouldLockExchange = lockedStatuses.includes(appliedStatus)
    const exchangeSource =
      form.fromCurrency === form.toCurrency ? 'Mesma moeda' : details.source
    const exchangeDetail = getExchangeSourceDetail(form, exchangeState, exchangeSource)

    return {
      id,
      description,
      type: form.type,
      amount: Number(amount) || 0,
      fromCurrency: form.fromCurrency,
      toCurrency: form.toCurrency,
      convertedAmount: details.finalAmount,
      accountId: form.accountId,
      cardId: form.type === 'expense' ? form.cardId : '',
      categoryId: form.categoryId,
      date,
      percentageFee: Number(form.percentageFee) || 0,
      fixedFee: Number(form.fixedFee) || 0,
      manualRate: form.manualRate,
      rate: details.rate,
      useAutomaticRate: form.useAutomaticRate,
      status: appliedStatus,
      shared: form.type === 'expense' ? form.shared : false,
      sharedAmountToReceive:
        form.type === 'expense' && form.shared
          ? Number(form.sharedAmountToReceive) || 0
          : 0,
      exchangeSource,
      exchangeDetail,
      exchangeDate: details.rateDate,
      sourceUpdatedAt: details.rateDate,
      confirmedAt: shouldLockExchange ? currentTransaction?.confirmedAt || new Date().toISOString() : '',
      exchangeLocked: shouldLockExchange,
      ...recurrenceMeta,
    }
  }

  function createSingleTransaction(currentTransaction) {
    return getBaseTransaction({
      id: editingId || `txn-${Date.now()}`,
      description: form.description.trim(),
      amount: Number(form.amount) || 0,
      date: form.date,
      currentTransaction,
      recurrenceMeta: {
        recurrenceType: 'none',
        recurrenceId: '',
        isRecurring: false,
        isInstallment: false,
      },
    })
  }

  function createFixedTransactions() {
    const recurrenceId = `rec-${Date.now()}`
    const startDate = form.recurrenceStartDate || form.date
    const endDate = form.recurrenceEndDate
    const repeatDay = Number(form.repeatDay) || 1
    const occurrences = []
    const maxOccurrences = endDate ? 120 : 24

    for (let index = 0; index < maxOccurrences; index += 1) {
      const monthBase = addMonthsToDate(startDate, index)
      const occurrenceDate = getDateWithDay(monthBase, repeatDay)

      if (occurrenceDate < startDate) {
        continue
      }

      if (endDate && occurrenceDate > endDate) {
        break
      }

      occurrences.push(
        getBaseTransaction({
          id: `txn-${Date.now()}-fix-${index}`,
          description: form.description.trim(),
          amount: Number(form.amount) || 0,
          date: occurrenceDate,
          status: form.recurrenceInitialStatus,
          recurrenceMeta: {
            recurrenceType: 'fixed',
            recurrenceId,
            recurrenceScope: 'all',
            parentTransactionId: recurrenceId,
            parentDescription: form.description.trim(),
            repeatDay,
            startDate,
            endDate,
            occurrenceDate,
            isRecurring: true,
            isInstallment: false,
          },
        }),
      )
    }

    return occurrences
  }

  function createInstallmentTransactions() {
    const recurrenceId = `parc-${Date.now()}`
    const installmentTotal = Number(form.installmentCount) || 1
    const installmentStartNumber = Number(form.installmentStartNumber) || 1
    const rawAmount = Number(form.amount) || 0
    const installmentAmount =
      form.installmentAmountMode === 'total'
        ? rawAmount / installmentTotal
        : rawAmount
    const firstDate = form.installmentFirstDate || form.date
    const occurrences = []

    for (
      let installmentNumber = installmentStartNumber;
      installmentNumber <= installmentTotal;
      installmentNumber += 1
    ) {
      const index = installmentNumber - installmentStartNumber
      const occurrenceDate = addMonthsToDate(firstDate, index)
      const description = `${form.description.trim()} (${installmentNumber}/${installmentTotal})`

      occurrences.push(
        getBaseTransaction({
          id: `txn-${Date.now()}-parc-${installmentNumber}`,
          description,
          amount: installmentAmount,
          date: occurrenceDate,
          status: form.installmentInitialStatus,
          recurrenceMeta: {
            recurrenceType: 'installment',
            recurrenceId,
            recurrenceScope: 'all',
            parentTransactionId: recurrenceId,
            parentDescription: form.description.trim(),
            installmentNumber,
            installmentTotal,
            startDate: firstDate,
            occurrenceDate,
            isRecurring: false,
            isInstallment: true,
          },
        }),
      )
    }

    return occurrences
  }

  function applyEditToRecurringOccurrence(transaction, sourceTransaction) {
    const shouldPreserveLockedExchange = hasLockedExchange(transaction)
    const installmentDescription =
      transaction.recurrenceType === 'installment'
        ? `${form.description.trim()} (${transaction.installmentNumber}/${transaction.installmentTotal})`
        : form.description.trim()
    const amount = Number(form.amount) || 0
    const details = shouldPreserveLockedExchange
      ? null
      : getConversionForAmount(amount)
    const nextStatus = shouldPreserveLockedExchange
      ? transaction.status
      : form.type === 'expense' && form.shared
        ? 'confirmed'
        : form.status

    return {
      ...transaction,
      description: installmentDescription,
      parentDescription: form.description.trim(),
      type: form.type,
      amount,
      fromCurrency: form.fromCurrency,
      toCurrency: form.toCurrency,
      accountId: form.accountId,
      cardId: form.type === 'expense' ? form.cardId : '',
      categoryId: form.categoryId,
      percentageFee: Number(form.percentageFee) || 0,
      fixedFee: Number(form.fixedFee) || 0,
      manualRate: form.manualRate,
      useAutomaticRate: form.useAutomaticRate,
      shared: form.type === 'expense' ? form.shared : false,
      sharedAmountToReceive:
        form.type === 'expense' && form.shared
          ? Number(form.sharedAmountToReceive) || 0
          : 0,
      status: nextStatus,
      convertedAmount: shouldPreserveLockedExchange
        ? transaction.convertedAmount
        : details.finalAmount,
      rate: shouldPreserveLockedExchange ? transaction.rate : details.rate,
      exchangeSource: shouldPreserveLockedExchange
        ? transaction.exchangeSource
        : form.fromCurrency === form.toCurrency
          ? 'Mesma moeda'
          : details.source,
      exchangeDetail: shouldPreserveLockedExchange
        ? transaction.exchangeDetail
        : getExchangeSourceDetail(sourceTransaction, exchangeState, details.source),
      exchangeDate: shouldPreserveLockedExchange
        ? transaction.exchangeDate
        : details.rateDate,
      sourceUpdatedAt: shouldPreserveLockedExchange
        ? transaction.sourceUpdatedAt
        : details.rateDate,
      exchangeLocked: shouldPreserveLockedExchange || lockedStatuses.includes(nextStatus),
      confirmedAt: shouldPreserveLockedExchange ? transaction.confirmedAt : '',
    }
  }

  function isInScope(transaction, sourceTransaction, scope) {
    if (scope === 'single') {
      return transaction.id === sourceTransaction.id
    }

    if (transaction.recurrenceId !== sourceTransaction.recurrenceId) {
      return false
    }

    if (scope === 'all') {
      return true
    }

    if (sourceTransaction.recurrenceType === 'installment') {
      return (
        Number(transaction.installmentNumber) >=
        Number(sourceTransaction.installmentNumber)
      )
    }

    return transaction.date >= sourceTransaction.date
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

    if (editingId && currentTransaction && isRecurringTransaction(currentTransaction)) {
      const scope = getScopeFromPrompt('edit')

      if (!scope) {
        return
      }

      setTransactions((currentTransactions) =>
        currentTransactions.map((transaction) =>
          isInScope(transaction, currentTransaction, scope)
            ? applyEditToRecurringOccurrence(transaction, currentTransaction)
            : transaction,
        ),
      )
      resetForm()
      setFeedback('Recorrência atualizada conforme o escopo escolhido.')
      return
    }

    const nextTransactions =
      form.recurrenceType === 'fixed'
        ? createFixedTransactions()
        : form.recurrenceType === 'installment'
          ? createInstallmentTransactions()
          : [createSingleTransaction(currentTransaction)]

    setTransactions((currentTransactions) => {
      if (editingId) {
        return currentTransactions.map((transaction) =>
          transaction.id === editingId ? nextTransactions[0] : transaction,
        )
      }

      return [...nextTransactions, ...currentTransactions]
    })

    const successMessage = editingId
      ? 'Transação atualizada com sucesso.'
      : form.recurrenceType === 'fixed'
        ? 'Transação fixa mensal criada com sucesso.'
        : form.recurrenceType === 'installment'
          ? 'Parcelamento criado com sucesso.'
          : 'Transação salva com sucesso.'
    resetForm()
    setFeedback(successMessage)
  }

  function handleDelete(transactionId) {
    const transactionToDelete = transactions.find(
      (transaction) => transaction.id === transactionId,
    )
    let scope = 'single'

    if (transactionToDelete && isRecurringTransaction(transactionToDelete)) {
      scope = getScopeFromPrompt('delete')

      if (!scope) {
        return
      }
    }

    const shouldDelete = window.confirm('Deseja excluir esta transação?')

    if (!shouldDelete) {
      return
    }

    setTransactions((currentTransactions) => {
      if (!transactionToDelete || !isRecurringTransaction(transactionToDelete)) {
        return currentTransactions.filter((transaction) => transaction.id !== transactionId)
      }

      return currentTransactions.filter(
        (transaction) => !isInScope(transaction, transactionToDelete, scope),
      )
    })
    setFeedback('Transação excluída com sucesso.')
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{sortedTransactions.length} transações</strong>
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

      <SortControls
        options={transactionSortOptions}
        sortConfig={transactionSortConfig}
        onChange={updateTransactionSort}
      />

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
            <DatePicker
              value={filters.startDate}
              onChange={(value) => updateFilter('startDate', value)}
              allowClear
              placeholder="Data inicial"
              ariaLabel="Selecionar data inicial"
            />
          </label>
          <label className="field">
            <span>Data final</span>
            <DatePicker
              value={filters.endDate}
              onChange={(value) => updateFilter('endDate', value)}
              allowClear
              placeholder="Data final"
              ariaLabel="Selecionar data final"
            />
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
              <DatePicker
                value={form.date}
                onChange={(value) => updateField('date', value)}
                placeholder="Data da transação"
                ariaLabel="Selecionar data da transação"
              />
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
            <div className="recurrence-section span-2">
              <div className="recurrence-heading">
                <strong>Repetição</strong>
                <span>Crie lançamentos fixos mensais ou parcelamentos.</span>
              </div>
              <div className="recurrence-grid">
                <label className="field">
                  <span>Tipo de repetição</span>
                  <select
                    value={form.recurrenceType}
                    disabled={Boolean(editingId)}
                    onChange={(event) => updateField('recurrenceType', event.target.value)}
                  >
                    <option value="none">{recurrenceTypeLabels.none}</option>
                    <option value="fixed">{recurrenceTypeLabels.fixed}</option>
                    <option value="installment">{recurrenceTypeLabels.installment}</option>
                  </select>
                </label>

                {editingId && form.recurrenceType !== 'none' ? (
                  <p className="recurrence-note">
                    Ao salvar, escolha o escopo: só este mês, esta e as próximas ou toda a recorrência.
                  </p>
                ) : null}

                {form.recurrenceType === 'fixed' ? (
                  <>
                    <label className="field">
                      <span>Dia do mês</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={form.repeatDay}
                        onChange={(event) => updateField('repeatDay', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Data inicial</span>
                      <DatePicker
                        value={form.recurrenceStartDate}
                        onChange={(value) => updateField('recurrenceStartDate', value)}
                        placeholder="Data inicial"
                        ariaLabel="Selecionar início da recorrência"
                      />
                    </label>
                    <label className="field">
                      <span>Data final opcional</span>
                      <DatePicker
                        value={form.recurrenceEndDate}
                        onChange={(value) => updateField('recurrenceEndDate', value)}
                        allowClear
                        placeholder="Sem data final"
                        ariaLabel="Selecionar fim da recorrência"
                      />
                    </label>
                    <label className="field">
                      <span>Status inicial</span>
                      <select
                        value={form.recurrenceInitialStatus}
                        onChange={(event) =>
                          updateField('recurrenceInitialStatus', event.target.value)
                        }
                      >
                        <option value="pending">{statusLabels.pending}</option>
                        <option value="receivable">{statusLabels.receivable}</option>
                        <option value="confirmed">{statusLabels.confirmed}</option>
                      </select>
                    </label>
                  </>
                ) : null}

                {form.recurrenceType === 'installment' ? (
                  <>
                    <label className="field">
                      <span>Quantidade de parcelas</span>
                      <input
                        type="number"
                        min="2"
                        max="120"
                        value={form.installmentCount}
                        onChange={(event) =>
                          updateField('installmentCount', event.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Parcela inicial</span>
                      <input
                        type="number"
                        min="1"
                        max={form.installmentCount || 120}
                        value={form.installmentStartNumber}
                        onChange={(event) =>
                          updateField('installmentStartNumber', event.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Valor informado</span>
                      <select
                        value={form.installmentAmountMode}
                        onChange={(event) =>
                          updateField('installmentAmountMode', event.target.value)
                        }
                      >
                        <option value="total">Valor total</option>
                        <option value="installment">Valor da parcela</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Primeira parcela</span>
                      <DatePicker
                        value={form.installmentFirstDate}
                        onChange={(value) => updateField('installmentFirstDate', value)}
                        placeholder="Data da primeira parcela"
                        ariaLabel="Selecionar data da primeira parcela"
                      />
                    </label>
                    <label className="field">
                      <span>Status inicial</span>
                      <select
                        value={form.installmentInitialStatus}
                        onChange={(event) =>
                          updateField('installmentInitialStatus', event.target.value)
                        }
                      >
                        <option value="pending">{statusLabels.pending}</option>
                        <option value="confirmed">{statusLabels.confirmed}</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>
            </div>
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
                <th>
                  <SortButton
                    label="Descrição"
                    sortKey="description"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Tipo"
                    sortKey="type"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Conta"
                    sortKey="account"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Cartão"
                    sortKey="card"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Valor original"
                    sortKey="amount"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Convertido"
                    sortKey="converted"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Categoria"
                    sortKey="category"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Data"
                    sortKey="date"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Status"
                    sortKey="status"
                    sortConfig={transactionSortConfig}
                    onSort={requestTransactionSort}
                  />
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((transaction) => {
                const account = accounts.find((item) => item.id === transaction.accountId)
                const card = cards.find((item) => item.id === transaction.cardId)
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
                      {isRecurringTransaction(transaction) ? (
                        <small className="shared-note">
                          {transaction.recurrenceType === 'installment'
                            ? `Parcela ${transaction.installmentNumber}/${transaction.installmentTotal}`
                            : 'Fixa mensal'}
                        </small>
                      ) : null}
                    </td>
                    <td data-label="Tipo">
                      <span className={`status-pill ${transaction.type}`}>
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td data-label="Conta">{account?.name || 'Conta removida'}</td>
                    <td data-label="Cartão">{card?.name || 'Sem cartão'}</td>
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

        {sortedTransactions.length === 0 ? (
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
