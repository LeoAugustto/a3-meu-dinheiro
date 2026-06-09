import { formatCurrency } from '../utils/currency'

function CategoryBar({ label, value, maxValue, color = '#1f9d72' }) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0

  return (
    <div className="category-bar">
      <div className="category-bar-header">
        <span>{label}</span>
        <strong>{formatCurrency(value, 'BRL')}</strong>
      </div>
      <div className="category-bar-track">
        <span
          className="category-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default CategoryBar
