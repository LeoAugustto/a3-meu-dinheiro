import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CalendarDays, CreditCard, Edit3, Plus, Trash2, X } from 'lucide-react'
import { formatCurrency } from '../utils/currency'
import { calculateCardUsage } from '../utils/finance'

const emptyForm = {
  name: '',
  brand: '',
  accountId: '',
  limit: 0,
  used: 0,
  closingDay: 1,
  dueDay: 10,
  color: '#117a65',
}

function Cards() {
  const { cards, setCards, accounts, transactions, settings } = useOutletContext()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const cardsWithUsage = useMemo(
    () => calculateCardUsage(cards, transactions),
    [cards, transactions],
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

  function openEdit(card) {
    setForm(card)
    setEditingId(card.id)
    setIsFormOpen(true)
    setError('')
    setFeedback('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Informe o nome do cartão.')
      return
    }

    const nextCard = {
      ...form,
      id: editingId || `card-${Date.now()}`,
      limit: Number(form.limit) || 0,
      used: Number(form.used) || 0,
      closingDay: Number(form.closingDay) || 1,
      dueDay: Number(form.dueDay) || 1,
    }

    const successMessage = editingId
      ? 'Cartão atualizado com sucesso.'
      : 'Cartão criado com sucesso.'

    setCards((currentCards) =>
      editingId
        ? currentCards.map((card) => (card.id === editingId ? nextCard : card))
        : [...currentCards, nextCard],
    )
    resetForm()
    setFeedback(successMessage)
  }

  function handleDelete(cardId) {
    const shouldDelete = window.confirm('Deseja excluir este cartão?')

    if (shouldDelete) {
      setCards((currentCards) => currentCards.filter((card) => card.id !== cardId))
      setFeedback('Cartão excluído com sucesso.')
    }
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{cards.length} cartões</strong>
          <span>Cartões com limite, fechamento, vencimento e conta associada.</span>
        </div>
        <button
          className="primary-button compact"
          type="button"
          onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))}
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'Fechar' : 'Novo cartão'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}

      {isFormOpen ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cadastro</span>
              <h2>{editingId ? 'Editar cartão' : 'Novo cartão'}</h2>
            </div>
            <CreditCard size={22} />
          </div>

          <form className="entity-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ex.: Cartão principal"
              />
            </label>
            <label className="field">
              <span>Bandeira</span>
              <input
                value={form.brand}
                onChange={(event) => updateField('brand', event.target.value)}
                placeholder="Ex.: Visa"
              />
            </label>
            <label className="field">
              <span>Conta associada</span>
              <select
                value={form.accountId}
                onChange={(event) => updateField('accountId', event.target.value)}
              >
                <option value="">Sem conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Limite total</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.limit}
                onChange={(event) => updateField('limit', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Fatura inicial</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.used}
                onChange={(event) => updateField('used', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Dia de fechamento</span>
              <input
                type="number"
                min="1"
                max="31"
                value={form.closingDay}
                onChange={(event) => updateField('closingDay', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Dia de vencimento</span>
              <input
                type="number"
                min="1"
                max="31"
                value={form.dueDay}
                onChange={(event) => updateField('dueDay', event.target.value)}
              />
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
                {editingId ? 'Atualizar cartão' : 'Salvar cartão'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {cardsWithUsage.length === 0 ? (
        <p className="empty-state">Nenhum cartão cadastrado ainda.</p>
      ) : (
        <section className="content-grid cards-grid">
          {cardsWithUsage.map((card) => (
            <article className="credit-card-panel" key={card.id}>
              <div className="credit-card-visual" style={{ backgroundColor: card.color }}>
                <CreditCard size={28} />
                <strong>{card.name}</strong>
                <span>{card.brand || 'Cartão'} • **** 2048</span>
              </div>

              <div className="credit-card-details">
                <div>
                  <span>Fatura atual</span>
                  <strong>{formatCurrency(card.currentBill, settings.mainCurrency)}</strong>
                </div>
                <div>
                  <span>Limite total</span>
                  <strong>{formatCurrency(card.limit, settings.mainCurrency)}</strong>
                </div>
              </div>

              <div className="mini-progress">
                <span style={{ width: `${card.usagePercent}%`, backgroundColor: card.color }} />
              </div>

              <div className="card-dates">
                <span>
                  <CalendarDays size={16} />
                  Fecha dia {card.closingDay}
                </span>
                <span>Vence dia {card.dueDay}</span>
              </div>

              <div className="table-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => openEdit(card)}
                >
                  <Edit3 size={16} />
                  Editar
                </button>
                <button
                  className="secondary-button danger-text"
                  type="button"
                  onClick={() => handleDelete(card.id)}
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

export default Cards
