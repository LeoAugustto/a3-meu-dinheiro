function SortControls({ label = 'Ordenar', options, sortConfig, onChange }) {
  return (
    <div className="sort-controls" aria-label={label}>
      <label className="field compact-field">
        <span>Ordenar por</span>
        <select
          value={sortConfig.key}
          onChange={(event) => onChange(event.target.value, sortConfig.direction)}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field compact-field">
        <span>Ordem</span>
        <select
          value={sortConfig.direction}
          onChange={(event) => onChange(sortConfig.key, event.target.value)}
        >
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      </label>
    </div>
  )
}

export default SortControls
