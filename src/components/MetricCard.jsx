function MetricCard({ title, value, subtitle, icon: Icon, variant = 'neutral' }) {
  return (
    <article className={`metric-card metric-card-${variant}`}>
      <div className="metric-icon">
        {Icon ? <Icon size={22} /> : null}
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
    </article>
  )
}

export default MetricCard
