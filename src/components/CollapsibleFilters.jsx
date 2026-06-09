import { Filter } from 'lucide-react'

function CollapsibleFilters({
  title = 'Filtros',
  subtitle = 'Filtros avançados',
  isOpen,
  onToggle,
  children,
}) {
  return (
    <section className={`panel filters-panel collapsible-panel ${isOpen ? 'is-open' : ''}`}>
      <button
        className="filters-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>
          <Filter size={18} />
          <strong>{title}</strong>
        </span>
        <small>{isOpen ? 'Ocultar filtros' : subtitle}</small>
      </button>

      <div className="filters-collapsible-content" aria-hidden={!isOpen}>
        {children}
      </div>
    </section>
  )
}

export default CollapsibleFilters
