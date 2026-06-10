import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

function SortButton({ label, sortKey, sortConfig, onSort }) {
  const isActive = sortConfig.key === sortKey
  const Icon = !isActive
    ? ArrowUpDown
    : sortConfig.direction === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <button
      className={`sort-button ${isActive ? 'is-active' : ''}`}
      type="button"
      aria-label={`Ordenar por ${label}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <Icon size={14} />
    </button>
  )
}

export default SortButton
