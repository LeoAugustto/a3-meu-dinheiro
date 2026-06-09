import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../utils/currency'

function getPercent(value, base) {
  if (base <= 0) {
    return 0
  }

  return Math.max((value / base) * 100, 0)
}

function formatPercent(value) {
  return `${Math.round(value)}%`
}

function MonthlyBalanceHero({ summary, currency }) {
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
        {expenses > 0 ? (
          <span
            className="balance-segment expense"
            style={{ width: `${expenseWidth}%` }}
            tabIndex={0}
          >
            <span className="balance-tooltip">
              {income > 0
                ? `Despesas representam ${formatPercent(expensePercent)} das receitas`
                : noIncomeText}
              <strong>{formatCurrency(expenses, currency)}</strong>
            </span>
          </span>
        ) : null}

        {positiveBalance > 0 ? (
          <span
            className="balance-segment income"
            style={{ width: `${balanceWidth}%` }}
            tabIndex={0}
          >
            <span className="balance-tooltip">
              {income > 0
                ? `Saldo representa ${formatPercent(balancePercent)} das receitas`
                : noIncomeText}
              <strong>{formatCurrency(positiveBalance, currency)}</strong>
            </span>
          </span>
        ) : null}

        {receivables > 0 ? (
          <span
            className="balance-segment receivable"
            style={{ width: `${receivableWidth}%` }}
            tabIndex={0}
          >
            <span className="balance-tooltip">
              {income > 0
                ? `A receber representa ${formatPercent(receivablePercent)} das receitas`
                : 'A receber registrado neste mês'}
              <strong>{formatCurrency(receivables, currency)}</strong>
            </span>
          </span>
        ) : null}
      </div>

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
