import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CalendarClock, Edit3, Plus, Target, Trash2, X } from 'lucide-react'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/finance'

const emptyForm = {
  name: '',
  target: 0,
  current: 0,
  deadline: '',
  categoryId: '',
  color: '#117a65',
  icon: 'target',
}

function Goals() {
  const { goals, setGoals, categories, settings } = useOutletContext()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

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

  function openEdit(goal) {
    setForm(goal)
    setEditingId(goal.id)
    setIsFormOpen(true)
    setError('')
    setFeedback('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim() || Number(form.target) <= 0) {
      setError('Informe o nome e o valor alvo da meta.')
      return
    }

    const nextGoal = {
      ...form,
      id: editingId || `goal-${Date.now()}`,
      target: Number(form.target) || 0,
      current: Number(form.current) || 0,
    }

    const successMessage = editingId
      ? 'Meta atualizada com sucesso.'
      : 'Meta criada com sucesso.'

    setGoals((currentGoals) =>
      editingId
        ? currentGoals.map((goal) => (goal.id === editingId ? nextGoal : goal))
        : [...currentGoals, nextGoal],
    )
    resetForm()
    setFeedback(successMessage)
  }

  function handleDelete(goalId) {
    const shouldDelete = window.confirm('Deseja excluir esta meta?')

    if (shouldDelete) {
      setGoals((currentGoals) => currentGoals.filter((goal) => goal.id !== goalId))
      setFeedback('Meta excluída com sucesso.')
    }
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <strong>{goals.length} metas</strong>
          <span>Objetivos financeiros com prazo e progresso.</span>
        </div>
        <button
          className="primary-button compact"
          type="button"
          onClick={() => (isFormOpen ? resetForm() : setIsFormOpen(true))}
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'Fechar' : 'Nova meta'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}

      {isFormOpen ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cadastro</span>
              <h2>{editingId ? 'Editar meta' : 'Nova meta'}</h2>
            </div>
            <Target size={22} />
          </div>

          <form className="entity-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ex.: Reserva de emergência"
              />
            </label>
            <label className="field">
              <span>Valor alvo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.target}
                onChange={(event) => updateField('target', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Valor atual</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.current}
                onChange={(event) => updateField('current', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Prazo</span>
              <input
                type="date"
                value={form.deadline}
                onChange={(event) => updateField('deadline', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Categoria</span>
              <select
                value={form.categoryId}
                onChange={(event) => updateField('categoryId', event.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
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
                {editingId ? 'Atualizar meta' : 'Salvar meta'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {goals.length === 0 ? (
        <p className="empty-state">Nenhuma meta cadastrada ainda.</p>
      ) : (
        <section className="content-grid goals-grid">
          {goals.map((goal) => {
            const progress =
              Number(goal.target) > 0
                ? Math.min((Number(goal.current) / Number(goal.target)) * 100, 100)
                : 0

            return (
              <article className="goal-card" key={goal.id}>
                <div className="goal-topline">
                  <span
                    className="round-icon"
                    style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
                  >
                    <Target size={20} />
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <div>
                  <h2>{goal.name}</h2>
                  <p>
                    {formatCurrency(goal.current, settings.mainCurrency)} de{' '}
                    {formatCurrency(goal.target, settings.mainCurrency)}
                  </p>
                </div>

                <div className="mini-progress large">
                  <span style={{ width: `${progress}%`, backgroundColor: goal.color }} />
                </div>

                <div className="goal-deadline">
                  <CalendarClock size={16} />
                  <span>
                    {goal.deadline ? formatDate(goal.deadline) : 'Sem prazo'}
                  </span>
                </div>

                <div className="table-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => openEdit(goal)}
                  >
                    <Edit3 size={16} />
                    Editar
                  </button>
                  <button
                    className="secondary-button danger-text"
                    type="button"
                    onClick={() => handleDelete(goal.id)}
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

export default Goals
