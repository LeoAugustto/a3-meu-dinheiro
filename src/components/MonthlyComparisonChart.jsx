import { formatCurrency } from '../utils/currency'

function MonthlyComparisonChart({
  data,
  currency,
  emptyMessage = 'Nenhuma transação nos últimos meses.',
}) {
  const maxValue = Math.max(
    ...data.flatMap((month) => [month.income, month.expenses]),
    1,
  )
  const hasData = data.some((month) => month.income > 0 || month.expenses > 0)

  if (!hasData) {
    return (
      <div className="chart-empty-state">
        <p className="empty-state">{emptyMessage}</p>
        <div className="bar-chart is-empty" aria-hidden="true">
          {data.map((month) => (
            <div className="bar-group" key={month.month}>
              <div className="bar-pair">
                <span className="chart-bar income" />
                <span className="chart-bar expense" />
              </div>
              <strong>{month.label}</strong>
              <small>{formatCurrency(0, currency)}</small>
            </div>
          ))}
        </div>
        <div className="mobile-monthly-list" aria-label="Resumo mensal compacto">
          {data.map((month) => (
            <article className="mobile-monthly-card" key={month.month}>
              <strong>{month.label}</strong>
              <span>
                Receita
                <b>{formatCurrency(0, currency)}</b>
              </span>
              <span>
                Despesa
                <b>{formatCurrency(0, currency)}</b>
              </span>
              <span>
                Balanço
                <b>{formatCurrency(0, currency)}</b>
              </span>
            </article>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="monthly-chart-wrap">
      <div className="chart-legend">
        <span className="legend-item income">Receitas</span>
        <span className="legend-item expense">Despesas</span>
      </div>

      <div className="bar-chart" aria-label="Receitas e despesas por mês">
        {data.map((month) => {
          const incomeHeight = Math.max((month.income / maxValue) * 100, 4)
          const expenseHeight = Math.max((month.expenses / maxValue) * 100, 4)

          return (
            <div className="bar-group" key={month.month}>
              <div className="bar-pair">
                <button
                  className="chart-bar income"
                  type="button"
                  style={{ height: `${incomeHeight}%` }}
                  aria-label={`Receitas de ${month.label}: ${formatCurrency(month.income, currency)}`}
                >
                  <span className="chart-tooltip">
                    <strong>{month.label}</strong>
                    Receita: {formatCurrency(month.income, currency)}
                    <small>Balanço: {formatCurrency(month.balance, currency)}</small>
                  </span>
                </button>
                <button
                  className="chart-bar expense"
                  type="button"
                  style={{ height: `${expenseHeight}%` }}
                  aria-label={`Despesas de ${month.label}: ${formatCurrency(month.expenses, currency)}`}
                >
                  <span className="chart-tooltip">
                    <strong>{month.label}</strong>
                    Despesa: {formatCurrency(month.expenses, currency)}
                    <small>Balanço: {formatCurrency(month.balance, currency)}</small>
                  </span>
                </button>
              </div>
              <strong>{month.label}</strong>
              <small>{formatCurrency(month.balance, currency)}</small>
            </div>
          )
        })}
      </div>

      <div className="mobile-monthly-list" aria-label="Resumo mensal compacto">
        {data.map((month) => (
          <article className="mobile-monthly-card" key={month.month}>
            <strong>{month.label}</strong>
            <span>
              Receita
              <b>{formatCurrency(month.income, currency)}</b>
            </span>
            <span>
              Despesa
              <b>{formatCurrency(month.expenses, currency)}</b>
            </span>
            <span className={month.balance >= 0 ? 'income' : 'expense'}>
              Balanço
              <b>{formatCurrency(month.balance, currency)}</b>
            </span>
          </article>
        ))}
      </div>
    </div>
  )
}

export default MonthlyComparisonChart
