import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Edit3, Plus, Trash2, WalletCards, X } from 'lucide-react'
import { currencies } from '../data/mockData'
import { formatCurrency } from '../utils/currency'
import { calculateAccountBalances, statusLabels } from '../utils/finance'

const emptyForm = {
  name: '',
  type: 'Conta corrente',
  currency: 'BRL',
  initialBalance: 0,
  color: '#117a65',
  icon: 'wallet',
  status: 'active',
}

function Accounts() {
  const { accounts, setAccounts, transactions } = useOutletContext()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const accountsWithBalances = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions],
  )
  const sortedAccounts = useMemo(
    () =>
      [...accountsWithBalances].sort((first, second) =>
        first.name.localeCompare(second.name, 'pt-BR'),
      ),
    [accountsWithBalances],
  )

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(false)
    setError('')
    setFeedback('')
  }

  function openEdit(account) {
    setForm(account)
    setEditingId(account.id)
    setIsFormOpen(true)
    setError('')
    setFeedback('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Informe o nome da conta.')
      return
    }

    const nextAccount = {
      ...form,
      id: editingId || `acc-${Date.now()}`,
      initialBalance: Number(form.initialBalance) || 0,
    }

    const successMessage = editingId
      ? 'Conta atualizada com sucesso.'
      : 'Conta criada com sucesso.'

    setAccounts((currentAccounts) =>
      editingId
        ? currentAccounts.map((account) =>
            account.id === editingId ? nextAccount : account,
          )
        : [...currentAccounts, nextAccount],
    )
    resetForm()
    setFeedback(successMessage)
  }

  function handleDelete(accountId) {
    const hasTransactions = transactions.some(
      (transaction) => transaction.accountId === accountId,
    )

    if (hasTransactions) {
      setError('Não é possível excluir uma conta com transações vinculadas.')
      return
    }

    const shouldDelete = window.confirm('Deseja excluir esta conta?')

    if (!shouldDelete) {
      return
    }

    setAccounts((currentAccounts) =>
      currentAccounts.filter((account) => account.id !== accountId),
    )
    setFeedback('Conta excluída com sucesso.')
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{accounts.length} contas</strong>
          <span>Contas bancárias, carteiras digitais e dinheiro em caixa.</span>
        </div>
        <button
          className="primary-button compact"
          type="button"
          onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))}
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'Fechar' : 'Nova conta'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}

      {isFormOpen ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cadastro</span>
              <h2>{editingId ? 'Editar conta' : 'Nova conta'}</h2>
            </div>
            <WalletCards size={22} />
          </div>

          <form className="entity-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ex.: Conta principal"
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
              >
                <option>Conta corrente</option>
                <option>Carteira digital</option>
                <option>Dinheiro</option>
                <option>Internacional</option>
                <option>Poupança</option>
              </select>
            </label>
            <label className="field">
              <span>Moeda</span>
              <select
                value={form.currency}
                onChange={(event) => updateField('currency', event.target.value)}
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Saldo inicial</span>
              <input
                type="number"
                step="0.01"
                value={form.initialBalance}
                onChange={(event) =>
                  updateField('initialBalance', event.target.value)
                }
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                <option value="active">{statusLabels.active}</option>
                <option value="inactive">{statusLabels.inactive}</option>
              </select>
            </label>
            <label className="field">
              <span>Cor</span>
              <input
                type="color"
                value={form.color}
                onChange={(event) => updateField('color', event.target.value)}
              />
            </label>
            <div className="form-footer full-span">
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                {editingId ? 'Atualizar conta' : 'Salvar conta'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {accountsWithBalances.length === 0 ? (
        <p className="empty-state">Nenhuma conta cadastrada ainda.</p>
      ) : (
        <section className="content-grid">
          {sortedAccounts.map((account) => (
            <article className="account-card" key={account.id}>
              <div className="entity-topline">
                <span
                  className="round-icon"
                  style={{
                    backgroundColor: `${account.color}22`,
                    color: account.color,
                  }}
                >
                  <WalletCards size={20} />
                </span>
                <span className="soft-pill">
                  {account.status === 'active'
                    ? statusLabels.active
                    : statusLabels.inactive}
                </span>
              </div>
              <div>
                <h2>{account.name}</h2>
                <p>
                  {account.type} • {account.currency}
                </p>
              </div>
              <strong className="entity-amount">
                {formatCurrency(account.currentBalance, account.currency)}
              </strong>
              <div className="table-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => openEdit(account)}
                >
                  <Edit3 size={16} />
                  Editar
                </button>
                <button
                  className="secondary-button danger-text"
                  type="button"
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export default Accounts
