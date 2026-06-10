import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  BookOpen,
  Briefcase,
  Bus,
  CircleDollarSign,
  Edit3,
  HeartPulse,
  Home,
  MoreHorizontal,
  Plus,
  Receipt,
  Tags,
  Ticket,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import { formatCurrency } from '../utils/currency'
import { getCategoryTotals } from '../utils/finance'

const emptyForm = {
  name: '',
  type: 'expense',
  color: '#117a65',
  monthlyBudget: 0,
  icon: 'tag',
}

const categoryIconOptions = [
  { value: 'utensils', label: 'Alimentação', icon: Utensils },
  { value: 'home', label: 'Moradia', icon: Home },
  { value: 'bus', label: 'Transporte', icon: Bus },
  { value: 'book', label: 'Educação', icon: BookOpen },
  { value: 'heart', label: 'Saúde', icon: HeartPulse },
  { value: 'ticket', label: 'Lazer', icon: Ticket },
  { value: 'receipt', label: 'Assinaturas', icon: Receipt },
  { value: 'briefcase', label: 'Serviços', icon: Briefcase },
  { value: 'wallet', label: 'Carteira', icon: WalletCards },
  { value: 'dollar', label: 'Receita', icon: CircleDollarSign },
  { value: 'more', label: 'Outros', icon: MoreHorizontal },
  { value: 'tag', label: 'Geral', icon: Tags },
]

const categoryIconMap = categoryIconOptions.reduce((icons, option) => {
  icons[option.value] = option.icon
  return icons
}, {})

function CategoryIcon({ name, size = 20 }) {
  const Icon = categoryIconMap[name] || Tags

  return <Icon size={size} />
}

function Categories() {
  const {
    categories,
    setCategories,
    transactions,
    setTransactions,
    selectedMonth,
    settings,
  } = useOutletContext()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const totals = useMemo(
    () => getCategoryTotals(transactions, selectedMonth),
    [transactions, selectedMonth],
  )
  const sortedCategories = useMemo(
    () =>
      [...categories].sort((first, second) =>
        first.name.localeCompare(second.name, 'pt-BR'),
      ),
    [categories],
  )

  function getTotalForCategory(categoryId) {
    return totals.find((item) => item.categoryId === categoryId)?.total || 0
  }

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

  function openEdit(category) {
    setForm(category)
    setEditingId(category.id)
    setIsFormOpen(true)
    setError('')
    setFeedback('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Informe o nome da categoria.')
      return
    }

    const nextCategory = {
      ...form,
      id: editingId || `cat-${Date.now()}`,
      monthlyBudget: Number(form.monthlyBudget) || 0,
    }

    const successMessage = editingId
      ? 'Categoria atualizada com sucesso.'
      : 'Categoria criada com sucesso.'

    setCategories((currentCategories) =>
      editingId
        ? currentCategories.map((category) =>
            category.id === editingId ? nextCategory : category,
          )
        : [...currentCategories, nextCategory],
    )
    resetForm()
    setFeedback(successMessage)
  }

  function handleDelete(categoryId) {
    const category = categories.find((item) => item.id === categoryId)

    if (category?.protected) {
      setError('A categoria Outros não pode ser excluída.')
      return
    }

    setPendingDeleteId(categoryId)
  }

  function confirmDelete() {
    if (!pendingDeleteId) {
      return
    }

    const hasTransactions = transactions.some(
      (transaction) => transaction.categoryId === pendingDeleteId,
    )

    if (hasTransactions) {
      setTransactions((currentTransactions) =>
        currentTransactions.map((transaction) =>
          transaction.categoryId === pendingDeleteId
            ? { ...transaction, categoryId: 'cat-other' }
            : transaction,
        ),
      )
    }

    setCategories((currentCategories) =>
      currentCategories.filter((item) => item.id !== pendingDeleteId),
    )
    setPendingDeleteId('')
    setFeedback('Categoria excluída com sucesso.')
  }

  const pendingDeleteHasTransactions = transactions.some(
    (transaction) => transaction.categoryId === pendingDeleteId,
  )

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{categories.length} categorias</strong>
          <span>Categorias usadas em receitas, despesas e relatórios.</span>
        </div>
        <button
          className="primary-button compact"
          type="button"
          onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))}
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'Fechar' : 'Nova categoria'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}

      {isFormOpen ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cadastro</span>
              <h2>{editingId ? 'Editar categoria' : 'Nova categoria'}</h2>
            </div>
            <Tags size={22} />
          </div>

          <form className="entity-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ex.: Mercado"
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
                <option value="both">Ambos</option>
              </select>
            </label>
            <label className="field">
              <span>Orçamento mensal</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyBudget}
                onChange={(event) =>
                  updateField('monthlyBudget', event.target.value)
                }
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
            <fieldset className="icon-picker full-span">
              <legend>Ícone</legend>
              <div className="icon-picker-grid">
                {categoryIconOptions.map((option) => {
                  const isSelected = form.icon === option.value

                  return (
                    <button
                      className={`icon-picker-option ${isSelected ? 'is-selected' : ''}`}
                      type="button"
                      key={option.value}
                      aria-pressed={isSelected}
                      onClick={() => updateField('icon', option.value)}
                    >
                      <CategoryIcon name={option.value} size={19} />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="form-footer full-span">
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                {editingId ? 'Atualizar categoria' : 'Salvar categoria'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {categories.length === 0 ? (
        <p className="empty-state">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <section className="content-grid">
          {sortedCategories.map((category) => {
            const total = getTotalForCategory(category.id)
            const budget = Number(category.monthlyBudget) || 0
            const budgetUsage =
              budget > 0
                ? Math.min((total / budget) * 100, 100)
                : 0
            const rawBudgetUsage = budget > 0 ? (total / budget) * 100 : 0
            const budgetDifference = Math.abs(budget - total)
            const isOverBudget = budget > 0 && total > budget

            return (
              <article className="category-card" key={category.id}>
                <div className="category-card-header">
                  <span
                    className="round-icon"
                    style={{
                      backgroundColor: `${category.color}22`,
                      color: category.color,
                    }}
                  >
                    <CategoryIcon name={category.icon} size={20} />
                  </span>
                  <span className={`category-kind ${category.type}`}>
                    {category.type === 'income'
                      ? 'Receita'
                      : category.type === 'expense'
                        ? 'Despesa'
                        : 'Ambos'}
                  </span>
                </div>

                <div>
                  <h2>{category.name}</h2>
                  <p>{formatCurrency(total, settings.mainCurrency)} gasto neste mês</p>
                </div>

                {budget > 0 ? (
                  <div className="category-budget">
                    <div className="category-budget-summary">
                      <strong>
                        {formatCurrency(total, settings.mainCurrency)} de{' '}
                        {formatCurrency(budget, settings.mainCurrency)}
                      </strong>
                      <span>{Math.round(rawBudgetUsage)}% do orçamento usado</span>
                      <small className={isOverBudget ? 'is-over-budget' : ''}>
                        {formatCurrency(budgetDifference, settings.mainCurrency)}{' '}
                        {isOverBudget ? 'acima do orçamento' : 'restantes'}
                      </small>
                    </div>
                    <div className="mini-progress">
                      <span
                        className={isOverBudget ? 'is-over-budget' : ''}
                        style={{
                          width: `${budgetUsage}%`,
                          backgroundColor: isOverBudget ? undefined : category.color,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="soft-pill">Sem orçamento mensal</span>
                )}

                <div className="table-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => openEdit(category)}
                  >
                    <Edit3 size={16} />
                    Editar
                  </button>
                  <button
                    className="secondary-button danger-text"
                    type="button"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      <ConfirmModal
        open={Boolean(pendingDeleteId)}
        title="Deseja excluir esta categoria?"
        description={
          pendingDeleteHasTransactions
            ? 'Existem transações nesta categoria. Elas serão movidas para Outros antes da exclusão.'
            : 'A categoria será removida da lista de categorias.'
        }
        confirmLabel="Excluir"
        variant="danger"
        onCancel={() => setPendingDeleteId('')}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

export default Categories
