import { useCallback, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Download,
  HandCoins,
  Landmark,
  Percent,
  Printer,
  WalletCards,
} from 'lucide-react'
import CategoryBar from '../components/CategoryBar'
import CollapsibleFilters from '../components/CollapsibleFilters'
import DatePicker from '../components/DatePicker'
import MetricCard from '../components/MetricCard'
import MonthPicker from '../components/MonthPicker'
import SortControls from '../components/SortControls'
import { currencies } from '../data/mockData'
import { useSortableData } from '../hooks/useSortableData'
import {
  formatCurrency,
  formatExchangeDate,
  formatExchangeSource,
} from '../utils/currency'
import {
  applyTransactionFilters,
  getFeesTotal,
  isBalanceTransaction,
  isReceivableTransaction,
} from '../utils/finance'
import {
  formatCommitmentSubtitle,
  getCommitmentSummary,
  recurrenceTypeLabels,
} from '../utils/recurrences'

function getMonthRange(month) {
  if (!month || !month.includes('-')) {
    return { startDate: '', endDate: '' }
  }

  const [year, monthIndex] = month.split('-').map(Number)
  const startDate = `${year}-${String(monthIndex).padStart(2, '0')}-01`
  const end = new Date(year, monthIndex, 0)
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(
    end.getDate(),
  ).padStart(2, '0')}`

  return { startDate, endDate }
}

function getCategoryTotalsFromTransactions(transactions, type) {
  const totals = transactions
    .filter(
      (transaction) =>
        transaction.type === type && isBalanceTransaction(transaction),
    )
    .reduce((result, transaction) => {
      const categoryId = transaction.categoryId || 'cat-other'
      result[categoryId] =
        (result[categoryId] || 0) + (Number(transaction.convertedAmount) || 0)
      return result
    }, {})

  return Object.entries(totals)
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((first, second) => second.total - first.total)
}

function Reports() {
  const {
    transactions,
    accounts,
    cards,
    categories,
    selectedMonth,
    setSelectedMonth,
    settings,
  } = useOutletContext()
  const selectedMonthRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth])
  const [filters, setFilters] = useState({
    rangeMonth: '',
    startDate: '',
    endDate: '',
    accountId: 'all',
    categoryId: 'all',
    type: 'all',
    currency: 'all',
    cardId: 'all',
  })
  const [areFiltersOpen, setAreFiltersOpen] = useState(false)
  const filtersMatchCurrentMonth = filters.rangeMonth === selectedMonth
  const effectiveStartDate =
    filtersMatchCurrentMonth && filters.startDate
      ? filters.startDate
      : selectedMonthRange.startDate
  const effectiveEndDate =
    filtersMatchCurrentMonth && filters.endDate
      ? filters.endDate
      : selectedMonthRange.endDate

  const getCategoryName = useCallback(
    (categoryId) =>
      categories.find((category) => category.id === categoryId)?.name || 'Outros',
    [categories],
  )

  function updateFilter(field, value) {
    if (field === 'month') {
      setSelectedMonth(value)
      setFilters((currentFilters) => ({
        ...currentFilters,
        rangeMonth: '',
        startDate: '',
        endDate: '',
      }))
      return
    }

    setFilters((currentFilters) => {
      if (field === 'startDate' || field === 'endDate') {
        return {
          ...currentFilters,
          rangeMonth: selectedMonth,
          [field]: value,
        }
      }

      return { ...currentFilters, [field]: value }
    })
  }

  const reportTransactions = useMemo(
    () =>
      applyTransactionFilters(
        transactions,
        {
          ...filters,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          search: '',
          status: 'all',
        },
        getCategoryName,
      ).filter((transaction) => transaction.status !== 'cancelled'),
    [transactions, filters, effectiveStartDate, effectiveEndDate, getCategoryName],
  )

  const reportSummary = useMemo(
    () =>
      reportTransactions.reduce(
        (summary, transaction) => {
          const value = Number(transaction.convertedAmount) || 0

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

            if (
              Number(transaction.sharedAmountToReceive) > 0 &&
              transaction.status !== 'paid'
            ) {
              summary.sharedReceivables += Number(transaction.sharedAmountToReceive) || 0
            }
          }

          summary.balance = summary.income - summary.expenses
          return summary
        },
        {
          income: 0,
          expenses: 0,
          balance: 0,
          foreignIncome: 0,
          sharedReceivables: 0,
        },
      ),
    [reportTransactions],
  )
  const feesTotal = useMemo(() => getFeesTotal(reportTransactions), [reportTransactions])
  const expensesByCategory = useMemo(
    () => getCategoryTotalsFromTransactions(reportTransactions, 'expense'),
    [reportTransactions],
  )
  const incomeByCategory = useMemo(
    () => getCategoryTotalsFromTransactions(reportTransactions, 'income'),
    [reportTransactions],
  )
  const maxExpenseCategory = Math.max(
    ...expensesByCategory.map((category) => category.total),
    1,
  )
  const maxIncomeCategory = Math.max(
    ...incomeByCategory.map((category) => category.total),
    1,
  )
  const accountRows = accounts
    .map((account) => {
      const accountTransactions = reportTransactions.filter(
        (transaction) => transaction.accountId === account.id,
      )
      const income = accountTransactions
        .filter(
          (transaction) =>
            transaction.type === 'income' && isBalanceTransaction(transaction),
        )
        .reduce((total, transaction) => total + Number(transaction.convertedAmount || 0), 0)
      const expenses = accountTransactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' && isBalanceTransaction(transaction),
        )
        .reduce((total, transaction) => total + Number(transaction.convertedAmount || 0), 0)

      return {
        ...account,
        income,
        expenses,
        balance: income - expenses,
        count: accountTransactions.length,
      }
    })
    .filter((account) => account.count > 0)
  const cardRows = cards
    .map((card) => {
      const total = reportTransactions
        .filter(
          (transaction) =>
            transaction.cardId === card.id && isBalanceTransaction(transaction),
        )
        .reduce((sum, transaction) => sum + Number(transaction.convertedAmount || 0), 0)

      return { ...card, total }
    })
    .filter((card) => card.total > 0)
  const conversionRows = reportTransactions.filter(
    (transaction) => transaction.fromCurrency !== transaction.toCurrency,
  )
  const commitmentSummary = useMemo(
    () => getCommitmentSummary(reportTransactions, selectedMonth),
    [reportTransactions, selectedMonth],
  )
  const commitmentSortOptions = useMemo(
    () => [
      { key: 'name', label: 'Nome', getValue: (row) => row.name },
      {
        key: 'value',
        label: 'Valor',
        getValue: (row) => Number(row.monthlyValue || row.remainingValue) || 0,
      },
      {
        key: 'nextDueDate',
        label: 'Próximo vencimento',
        getValue: (row) => row.nextDueDate || '',
      },
      {
        key: 'remaining',
        label: 'Parcelas restantes',
        getValue: (row) => Number(row.openCount) || 0,
      },
      { key: 'status', label: 'Status', getValue: (row) => row.status },
    ],
    [],
  )
  const {
    sortedItems: sortedCommitments,
    sortConfig: commitmentSortConfig,
    updateSort: updateCommitmentSort,
  } = useSortableData(commitmentSummary.rows, commitmentSortOptions, {
    key: 'nextDueDate',
    direction: 'asc',
  })

  function exportCsv() {
    const headers = [
      'Descricao',
      'Tipo',
      'Valor original',
      'Moeda origem',
      'Valor convertido',
      'Moeda destino',
      'Categoria',
      'Data',
      'Status',
      'Fonte da cotacao',
      'Taxa usada',
      'Recorrencia',
      'Parcela',
    ]
    const rows = reportTransactions.map((transaction) => [
      transaction.description,
      transaction.type,
      transaction.amount,
      transaction.fromCurrency,
      transaction.convertedAmount,
      transaction.toCurrency,
      getCategoryName(transaction.categoryId),
      transaction.date,
      transaction.status,
      transaction.exchangeSource || '',
      transaction.rate || '',
      recurrenceTypeLabels[transaction.recurrenceType] || '',
      transaction.installmentTotal
        ? `${transaction.installmentNumber}/${transaction.installmentTotal}`
        : '',
    ])
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `meu-dinheiro-relatorio-${effectiveStartDate || 'inicio'}-${effectiveEndDate || 'fim'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{reportTransactions.length} transações no relatório</strong>
          <span>Resumo calculado com os dados salvos no app.</span>
        </div>
        <div className="table-actions">
          <button className="secondary-button" type="button" onClick={exportCsv}>
            <Download size={16} />
            Exportar CSV
          </button>
          <button className="secondary-button" type="button" onClick={printReport}>
            <Printer size={16} />
            Imprimir relatório
          </button>
        </div>
      </div>

      <CollapsibleFilters
        title="Filtros do relatório"
        subtitle="Período, conta, categoria, cartão e moeda"
        isOpen={areFiltersOpen}
        onToggle={() => setAreFiltersOpen((currentValue) => !currentValue)}
      >
        <div className="filters-grid">
          <div className="filter-month-picker span-2">
            <span>Mês base</span>
            <MonthPicker
              value={selectedMonth}
              onChange={(nextMonth) => updateFilter('month', nextMonth)}
            />
          </div>
          <label className="field">
            <span>Data inicial</span>
            <DatePicker
              value={effectiveStartDate}
              onChange={(value) => updateFilter('startDate', value)}
              allowClear
              placeholder="Data inicial"
              ariaLabel="Selecionar data inicial"
            />
          </label>
          <label className="field">
            <span>Data final</span>
            <DatePicker
              value={effectiveEndDate}
              onChange={(value) => updateFilter('endDate', value)}
              allowClear
              placeholder="Data final"
              ariaLabel="Selecionar data final"
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </label>
          <label className="field">
            <span>Conta</span>
            <select
              value={filters.accountId}
              onChange={(event) => updateFilter('accountId', event.target.value)}
            >
              <option value="all">Todas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Categoria</span>
            <select
              value={filters.categoryId}
              onChange={(event) => updateFilter('categoryId', event.target.value)}
            >
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Cartão</span>
            <select
              value={filters.cardId}
              onChange={(event) => updateFilter('cardId', event.target.value)}
            >
              <option value="all">Todos</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Moeda</span>
            <select
              value={filters.currency}
              onChange={(event) => updateFilter('currency', event.target.value)}
            >
              <option value="all">Todas</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CollapsibleFilters>

      <section className="metrics-grid">
        <MetricCard
          title="Receitas"
          value={formatCurrency(reportSummary.income, settings.mainCurrency)}
          subtitle="Entradas no período"
          icon={ArrowUpRight}
          variant="income"
        />
        <MetricCard
          title="Despesas"
          value={formatCurrency(reportSummary.expenses, settings.mainCurrency)}
          subtitle="Saídas no período"
          icon={ArrowDownLeft}
          variant="expense"
        />
        <MetricCard
          title="Balanço"
          value={formatCurrency(reportSummary.balance, settings.mainCurrency)}
          subtitle="Receitas menos despesas"
          icon={WalletCards}
          variant={reportSummary.balance >= 0 ? 'income' : 'expense'}
        />
        <MetricCard
          title="Taxas pagas"
          value={formatCurrency(feesTotal, settings.mainCurrency)}
          subtitle="Taxas percentuais e fixas"
          icon={Percent}
          variant="info"
        />
      </section>

      {reportTransactions.length === 0 ? (
        <section className="panel">
          <p className="empty-state">Nenhuma transação encontrada para o período selecionado.</p>
        </section>
      ) : (
        <>
          <section className="dashboard-grid">
            <div className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Categorias</span>
                  <h2>Gastos por categoria</h2>
                </div>
              </div>
              {expensesByCategory.length === 0 ? (
                <p className="empty-state">Nenhuma despesa neste período.</p>
              ) : (
                <div className="category-list">
                  {expensesByCategory.map((category) => (
                    <CategoryBar
                      key={category.categoryId}
                      label={getCategoryName(category.categoryId)}
                      value={category.total}
                      maxValue={maxExpenseCategory}
                      color={
                        categories.find((item) => item.id === category.categoryId)?.color
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Receitas</span>
                  <h2>Receitas por categoria</h2>
                </div>
              </div>
              {incomeByCategory.length === 0 ? (
                <p className="empty-state">Nenhuma receita neste período.</p>
              ) : (
                <div className="category-list">
                  {incomeByCategory.map((category) => (
                    <CategoryBar
                      key={category.categoryId}
                      label={getCategoryName(category.categoryId)}
                      value={category.total}
                      maxValue={maxIncomeCategory}
                      color={
                        categories.find((item) => item.id === category.categoryId)?.color
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-grid bottom-grid">
            <div className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Contas</span>
                  <h2>Transações por conta</h2>
                </div>
                <Landmark size={22} />
              </div>
              {accountRows.length === 0 ? (
                <p className="empty-state">Nenhuma conta movimentada neste período.</p>
              ) : (
                <div className="compact-list">
                  {accountRows.map((account) => (
                    <div className="compact-row" key={account.id}>
                      <div>
                        <strong>{account.name}</strong>
                        <span>
                          {account.count} transações • {account.currency}
                        </span>
                      </div>
                      <strong className={account.balance >= 0 ? 'income' : 'expense'}>
                        {formatCurrency(account.balance, account.currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Cartões</span>
                  <h2>Transações por cartão</h2>
                </div>
                <CreditCard size={22} />
              </div>
              {cardRows.length === 0 ? (
                <p className="empty-state">Nenhum cartão movimentado neste período.</p>
              ) : (
                <div className="compact-list">
                  {cardRows.map((card) => (
                    <div className="compact-row" key={card.id}>
                      <div>
                        <strong>{card.name}</strong>
                        <span>Fatura calculada no período</span>
                      </div>
                      <strong>{formatCurrency(card.total, settings.mainCurrency)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="metrics-grid report-detail-grid">
            <MetricCard
              title="Recebido em moeda estrangeira"
              value={formatCurrency(reportSummary.foreignIncome, settings.mainCurrency)}
              subtitle="Receitas convertidas"
              icon={ArrowUpRight}
              variant="neutral"
            />
            <MetricCard
              title="Contas divididas"
              value={formatCurrency(reportSummary.sharedReceivables, settings.mainCurrency)}
              subtitle="Valores marcados a receber"
              icon={HandCoins}
              variant="info"
            />
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Planejamento</span>
                <h2>Recorrências e parcelamentos</h2>
              </div>
            </div>

            <SortControls
              options={commitmentSortOptions}
              sortConfig={commitmentSortConfig}
              onChange={updateCommitmentSort}
            />

            <div className="metrics-grid compact-metrics">
              <MetricCard
                title="Fixas de despesa"
                value={formatCurrency(
                  commitmentSummary.fixedExpensesMonthlyValue,
                  settings.mainCurrency,
                )}
                subtitle={`${commitmentSummary.fixedExpensesCount} recorrências`}
                icon={ArrowDownLeft}
                variant="expense"
              />
              <MetricCard
                title="Fixas de receita"
                value={formatCurrency(
                  commitmentSummary.fixedIncomesMonthlyValue,
                  settings.mainCurrency,
                )}
                subtitle={`${commitmentSummary.fixedIncomesCount} recorrências`}
                icon={ArrowUpRight}
                variant="income"
              />
              <MetricCard
                title="Parcelas abertas"
                value={`${commitmentSummary.installmentsOpenCount}`}
                subtitle={formatCurrency(
                  commitmentSummary.installmentsRemainingValue,
                  settings.mainCurrency,
                )}
                icon={WalletCards}
                variant="info"
              />
            </div>

            {sortedCommitments.length === 0 ? (
              <p className="empty-state">Nenhuma recorrência ou parcelamento no período.</p>
            ) : (
              <div className="compact-list report-commitment-list">
                {sortedCommitments.map((row) => (
                  <div className="compact-row" key={row.id}>
                    <div>
                      <strong>{row.name}</strong>
                      <span>
                        {recurrenceTypeLabels[row.type] || row.type} • Próximo:{' '}
                        {row.nextLabel} • {row.status}
                      </span>
                      <span>{formatCommitmentSubtitle(row)}</span>
                    </div>
                    <strong>
                      {formatCurrency(
                        row.monthlyValue || row.remainingValue,
                        row.currency || settings.mainCurrency,
                      )}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Conversões</span>
                <h2>Conversões realizadas e taxas</h2>
              </div>
            </div>

            {conversionRows.length === 0 ? (
              <p className="empty-state">Nenhuma conversão de moeda neste período.</p>
            ) : (
              <div className="compact-list">
                {conversionRows.map((transaction) => (
                  <div className="compact-row" key={transaction.id}>
                    <div>
                      <strong>{transaction.description}</strong>
                      <span>
                        {transaction.fromCurrency} para {transaction.toCurrency} • Fonte:{' '}
                        {formatExchangeSource(transaction.exchangeSource)}
                        {transaction.exchangeDate
                          ? ` • Data da cotação: ${formatExchangeDate(transaction.exchangeDate)}`
                          : ''}
                      </span>
                    </div>
                    <strong>
                      {formatCurrency(transaction.amount, transaction.fromCurrency)} →{' '}
                      {formatCurrency(transaction.convertedAmount, transaction.toCurrency)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Reports
