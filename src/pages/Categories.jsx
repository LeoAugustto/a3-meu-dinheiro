import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Edit3, Plus, Tags, Trash2, X } from 'lucide-react'
import SortControls from '../components/SortControls'
import { useSortableData } from '../hooks/useSortableData'
import { formatCurrency } from '../utils/currency'
import { getCategoryTotals } from '../utils/finance'

const emptyForm = {
  name: '',
  type: 'expense',
  color: '#117a65',
  monthlyBudget: 0,
  icon: 'tag',
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
  const totals = useMemo(
    () => getCategoryTotals(transactions, selectedMonth),
    [transactions, selectedMonth],
  )
  const categorySortOptions = useMemo(
    () => [
      { key: 'name', label: 'Nome', getValue: (category) => category.name },
      { key: 'type', label: 'Tipo', getValue: (category) => category.type },
      {
        key: 'spent',
        label: 'Gasto no mês',
        getValue: (category) =>
          totals.find((item) => item.categoryId === category.id)?.total || 0,
      },
      {
        key: 'budget',
        label: 'Orçamento',
        getValue: (category) => Number(category.monthlyBudget) || 0,
      },
    ],
    [totals],
  )
  const {
    sortedItems: sortedCategories,
    sortConfig: categorySortConfig,
    updateSort: updateCategorySort,
  } = useSortableData(categories, categorySortOptions, {
    key: 'name',
    direction: 'asc',
  })

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

    const hasTransactions = transactions.some(
      (transaction) => transaction.categoryId === categoryId,
    )

    if (hasTransactions) {
      const shouldMove = window.confirm(
        'Existem transações nesta categoria. Deseja movê-las para Outros?',
      )

      if (!shouldMove) {
        return
      }

      setTransactions((currentTransactions) =>
        currentTransactions.map((transaction) =>
          transaction.categoryId === categoryId
            ? { ...transaction, categoryId: 'cat-other' }
            : transaction,
        ),
      )
    }

    const shouldDelete = window.confirm('Deseja excluir esta categoria?')

    if (shouldDelete) {
      setCategories((currentCategories) =>
        currentCategories.filter((item) => item.id !== categoryId),
      )
      setFeedback('Categoria excluída com sucesso.')
    }
  }

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

      <SortControls
        options={categorySortOptions}
        sortConfig={categorySortConfig}
        onChange={updateCategorySort}
      />

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
              <span>Ícone</span>
              <input
                value={form.icon}
                onChange={(event) => updateField('icon', event.target.value)}
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
            const budgetUsage =
              category.monthlyBudget > 0
                ? Math.min((total / category.monthlyBudget) * 100, 100)
                : 0

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
                    <Tags size={20} />
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
                  <p>
                    {formatCurrency(total, settings.mainCurrency)} gasto neste mês
                  </p>
                </div>

                {category.monthlyBudget > 0 ? (
                  <div className="mini-progress">
                    <span
                      style={{
                        width: `${budgetUsage}%`,
                        backgroundColor: category.color,
                      }}
                    />
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
    </div>
  )
}

export default Categories
