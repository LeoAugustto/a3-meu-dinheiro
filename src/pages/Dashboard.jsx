import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  Landmark,
  Repeat2,
  WalletCards,
} from 'lucide-react'
import CategoryBar from '../components/CategoryBar'
import MetricCard from '../components/MetricCard'
import MonthlyBalanceHero from '../components/MonthlyBalanceHero'
import MonthlyComparisonChart from '../components/MonthlyComparisonChart'
import TransactionItem from '../components/TransactionItem'
import { formatCurrency } from '../utils/currency'
import {
  formatCommitmentSubtitle,
  getCommitmentSummary,
  recurrenceTypeLabels,
} from '../utils/recurrences'
import {
  calculateAccountBalances,
  calculateCardUsage,
  getCategoryTotals,
  getConsolidatedBalance,
  getEffectiveConvertedAmount,
  getMonthSummary,
  getMonthlyComparison,
  getRecentTransactions,
} from '../utils/finance'

function Dashboard() {
  const {
    transactions,
    accounts,
    cards,
    categories,
    selectedMonth,
    settings,
    exchangeState,
  } = useOutletContext()
  const summary = useMemo(
    () => getMonthSummary(transactions, selectedMonth, exchangeState.rates),
    [transactions, selectedMonth, exchangeState.rates],
  )
  const accountsWithBalances = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions],
  )
  const cardsWithUsage = useMemo(
    () => calculateCardUsage(cards, transactions),
    [cards, transactions],
  )
  const consolidatedBalance = useMemo(
    () =>
      getConsolidatedBalance(
        accountsWithBalances,
        settings.mainCurrency,
        exchangeState.rates,
      ),
    [accountsWithBalances, settings.mainCurrency, exchangeState.rates],
  )
  const categoryTotals = useMemo(
    () => getCategoryTotals(transactions, selectedMonth),
    [transactions, selectedMonth],
  )
  const monthlyComparison = useMemo(
    () => getMonthlyComparison(transactions, selectedMonth, 6, exchangeState.rates),
    [transactions, selectedMonth, exchangeState.rates],
  )
  const recentTransactions = useMemo(
    () => getRecentTransactions(transactions, 5),
    [transactions],
  )
  const maxCategoryTotal = Math.max(
    ...categoryTotals.map((category) => category.total),
    1,
  )
  const commitmentSummary = useMemo(
    () => getCommitmentSummary(transactions, selectedMonth),
    [transactions, selectedMonth],
  )

  function getCategoryName(categoryId) {
    return categories.find((category) => category.id === categoryId)?.name || 'Outros'
  }

  return (
    <div className="page-stack">
      <section className="metrics-grid">
        <MetricCard
          title="Saldo consolidado"
          value={formatCurrency(consolidatedBalance, settings.mainCurrency)}
          subtitle="Soma das contas na moeda principal"
          icon={CircleDollarSign}
          variant={consolidatedBalance >= 0 ? 'income' : 'expense'}
        />
        <MetricCard
          title="Receitas do mês"
          value={formatCurrency(summary.income, settings.mainCurrency)}
          subtitle="Entradas confirmadas"
          icon={ArrowUpRight}
          variant="income"
        />
        <MetricCard
          title="Despesas do mês"
          value={formatCurrency(summary.expenses, settings.mainCurrency)}
          subtitle="Saídas confirmadas"
          icon={ArrowDownLeft}
          variant="expense"
        />
        <MetricCard
          title="A receber"
          value={formatCurrency(summary.sharedReceivables, settings.mainCurrency)}
          subtitle="Contas divididas ainda não recebidas"
          icon={HandCoins}
          variant="info"
        />
      </section>

      <MonthlyBalanceHero summary={summary} currency={settings.mainCurrency} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Planejamento</span>
            <h2>Compromissos futuros</h2>
          </div>
          <CalendarClock size={22} />
        </div>

        <div className="metrics-grid compact-metrics">
          <MetricCard
            title="Despesas fixas ativas"
            value={formatCurrency(
              commitmentSummary.fixedExpensesMonthlyValue,
              settings.mainCurrency,
            )}
            subtitle={`${commitmentSummary.fixedExpensesCount} recorrências`}
            icon={Repeat2}
            variant="expense"
          />
          <MetricCard
            title="Receitas fixas ativas"
            value={formatCurrency(
              commitmentSummary.fixedIncomesMonthlyValue,
              settings.mainCurrency,
            )}
            subtitle={`${commitmentSummary.fixedIncomesCount} recorrências`}
            icon={ArrowUpRight}
            variant="income"
          />
          <MetricCard
            title="Parcelamentos ativos"
            value={formatCurrency(
              commitmentSummary.installmentsMonthlyValue,
              settings.mainCurrency,
            )}
            subtitle={`${commitmentSummary.installmentsOpenCount} parcelas em aberto`}
            icon={WalletCards}
            variant="info"
          />
          <MetricCard
            title="Restante parcelado"
            value={formatCurrency(
              commitmentSummary.installmentsRemainingValue,
              settings.mainCurrency,
            )}
            subtitle="Valor restante previsto"
            icon={CircleDollarSign}
            variant="neutral"
          />
        </div>

        {commitmentSummary.rows.length === 0 ? (
          <p className="empty-state">Nenhuma recorrência ou parcelamento ativo.</p>
        ) : (
          <div className="compact-list commitment-list">
            {commitmentSummary.rows.slice(0, 6).map((row) => (
              <div className="compact-row" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    {recurrenceTypeLabels[row.type] || row.type} • Próximo:{' '}
                    {row.nextLabel}
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

      <section className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Comparativo</span>
              <h2>Receitas vs despesas</h2>
            </div>
          </div>

          <MonthlyComparisonChart
            data={monthlyComparison}
            currency={settings.mainCurrency}
          />
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Categorias</span>
              <h2>Gastos por categoria</h2>
            </div>
          </div>

          {categoryTotals.length === 0 ? (
            <p className="empty-state">Nenhum gasto cadastrado neste mês.</p>
          ) : (
            <div className="category-list">
              {categoryTotals.map((categoryTotal) => (
                <CategoryBar
                  key={categoryTotal.categoryId}
                  label={getCategoryName(categoryTotal.categoryId)}
                  value={categoryTotal.total}
                  maxValue={maxCategoryTotal}
                  color={
                    categories.find((category) => category.id === categoryTotal.categoryId)
                      ?.color
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
              <h2>Resumo das contas</h2>
            </div>
            <Landmark size={22} />
          </div>
          {accountsWithBalances.length === 0 ? (
            <p className="empty-state">Nenhuma conta cadastrada ainda.</p>
          ) : (
            <div className="compact-list">
              {accountsWithBalances.slice(0, 5).map((account) => (
                <div className="compact-row" key={account.id}>
                  <div>
                    <strong>{account.name}</strong>
                    <span>
                      {account.type} • {account.currency}
                    </span>
                  </div>
                  <strong>{formatCurrency(account.currentBalance, account.currency)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cartões</span>
              <h2>Resumo dos cartões</h2>
            </div>
            <WalletCards size={22} />
          </div>
          {cardsWithUsage.length === 0 ? (
            <p className="empty-state">Nenhum cartão cadastrado ainda.</p>
          ) : (
            <div className="compact-list">
              {cardsWithUsage.slice(0, 5).map((card) => (
                <div className="compact-row" key={card.id}>
                  <div>
                    <strong>{card.name}</strong>
                    <span>{Math.round(card.usagePercent)}% do limite usado</span>
                  </div>
                  <strong>{formatCurrency(card.currentBill, settings.mainCurrency)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Últimos lançamentos</span>
            <h2>Transações recentes</h2>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="empty-state">Nenhuma transação cadastrada ainda.</p>
        ) : (
          <div className="transaction-list">
            {recentTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                categoryName={getCategoryName(transaction.categoryId)}
                convertedAmount={getEffectiveConvertedAmount(
                  transaction,
                  exchangeState.rates,
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
