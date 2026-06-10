import { useState } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../utils/currency'

function getPercent(value, base) {
  if (base <= 0) {
    return 0
  }

  return Math.max((value / base) * 100, 0)
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)}%`
}

function MonthlyBalanceHero({ summary, currency }) {
  const [activeTooltip, setActiveTooltip] = useState(null)
  const income = Number(summary.income) || 0
  const expenses = Number(summary.expenses) || 0
  const balance = Number(summary.balance) || 0
  const receivables = Number(summary.sharedReceivables) || 0
  const positiveBalance = Math.max(balance, 0)
  const visualTotal = Math.max(income + receivables, expenses + positiveBalance + receivables, 1)
  const expensePercent = income > 0 ? getPercent(expenses, income) : 0
  const balancePercent = income > 0 ? getPercent(positiveBalance, income) : 0
  const receivablePercent = income > 0 ? getPercent(receivables, income) : 0
  const expenseWidth = Math.min(getPercent(expenses, visualTotal), 100)
  const balanceWidth = Math.min(getPercent(positiveBalance, visualTotal), 100)
  const receivableWidth = Math.min(getPercent(receivables, visualTotal), 100)
  const balanceState = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'
  const balanceLabel =
    balance > 0
      ? 'Sobrou neste mês'
      : balance < 0
        ? 'Gasto acima das receitas'
        : 'Receitas e despesas equilibradas'
  const balanceSign = balance > 0 ? '+ ' : balance < 0 ? '- ' : ''
  const BalanceIcon = balance > 0 ? TrendingUp : balance < 0 ? TrendingDown : Minus
  const hasAnyBarValue = expenses > 0 || positiveBalance > 0 || receivables > 0
  const noIncomeText = income <= 0 ? 'Sem receita no mês para calcular percentual.' : ''
  const segments = [
    {
      key: 'expense',
      className: 'expense',
      label: 'Despesas',
      value: expenses,
      width: expenseWidth,
      percent: expensePercent,
      description:
        income > 0
          ? `${formatPercent(expensePercent)} das receitas`
          : noIncomeText,
    },
    {
      key: 'income',
      className: 'income',
      label: 'Saldo restante',
      value: positiveBalance,
      width: balanceWidth,
      percent: balancePercent,
      description:
        income > 0
          ? `${formatPercent(balancePercent)} das receitas`
          : noIncomeText,
    },
    {
      key: 'receivable',
      className: 'receivable',
      label: 'A receber',
      value: receivables,
      width: receivableWidth,
      percent: receivablePercent,
      description:
        income > 0
          ? `${formatPercent(receivablePercent)} das receitas • Valor ainda não confirmado`
          : 'Valor ainda não confirmado',
    },
  ].filter((segment) => segment.value > 0)

  function showSegmentTooltip(event, segment) {
    if (typeof window === 'undefined') {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const tooltipWidth = 220
    const margin = 12
    const left = Math.min(
      Math.max(margin + tooltipWidth / 2, rect.left + rect.width / 2),
      window.innerWidth - margin - tooltipWidth / 2,
    )
    const shouldShowBelow = rect.top < 110
    const top = shouldShowBelow ? rect.bottom + 12 : rect.top - 12

    setActiveTooltip({
      ...segment,
      formattedValue: formatCurrency(segment.value, currency),
      left,
      top,
      placement: shouldShowBelow ? 'below' : 'above',
    })
  }

  function hideSegmentTooltip() {
    setActiveTooltip(null)
  }

  return (
    <section className={`panel balance-hero ${balanceState}`}>
      <div className="balance-hero-main">
        <div>
          <span className="eyebrow">Balanço do mês</span>
          <h2>{balanceLabel}</h2>
          <strong className="balance-hero-value">
            {balanceSign}
            {formatCurrency(Math.abs(balance), currency)}
          </strong>
        </div>
        <span className="balance-hero-icon">
          <BalanceIcon size={30} />
        </span>
      </div>

      <div className="balance-hero-breakdown">
        <span>
          Receitas
          <strong>{formatCurrency(income, currency)}</strong>
        </span>
        <span>
          Despesas
          <strong>{formatCurrency(expenses, currency)}</strong>
        </span>
        {receivables > 0 ? (
          <span>
            A receber
            <strong>{formatCurrency(receivables, currency)}</strong>
          </span>
        ) : null}
      </div>

      <div
        className={`balance-hero-bar ${hasAnyBarValue ? '' : 'is-empty'}`}
        aria-label="Distribuição do balanço mensal"
      >
        {segments.map((segment) => (
          <span
            className={`balance-segment ${segment.className} ${
              activeTooltip?.key === segment.key ? 'is-active' : ''
            }`}
            style={{ width: `${segment.width}%` }}
            tabIndex={0}
            key={segment.key}
            title={`${segment.label}: ${formatCurrency(segment.value, currency)}. ${
              segment.description
            }`}
            aria-label={`${segment.label}: ${formatCurrency(segment.value, currency)}. ${
              segment.description
            }`}
            onPointerEnter={(event) => showSegmentTooltip(event, segment)}
            onPointerMove={(event) => showSegmentTooltip(event, segment)}
            onPointerLeave={hideSegmentTooltip}
            onFocus={(event) => showSegmentTooltip(event, segment)}
            onBlur={hideSegmentTooltip}
          />
        ))}
      </div>

      {activeTooltip ? (
        <div
          className={`balance-fixed-tooltip is-${activeTooltip.placement}`}
          style={{
            left: `${activeTooltip.left}px`,
            top: `${activeTooltip.top}px`,
          }}
          role="tooltip"
        >
          <strong>{activeTooltip.label}</strong>
          <span>{activeTooltip.formattedValue}</span>
          <small>{activeTooltip.description}</small>
        </div>
      ) : null}

      <div className="balance-hero-legend">
        <span className="legend-item expense">Despesas</span>
        {positiveBalance > 0 ? (
          <span className="legend-item income">Saldo restante</span>
        ) : null}
        {receivables > 0 ? (
          <span className="legend-item receivable">A receber</span>
        ) : null}
      </div>
    </section>
  )
}

export default MonthlyBalanceHero
