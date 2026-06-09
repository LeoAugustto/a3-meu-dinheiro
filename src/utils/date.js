const ptBrLocalDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function normalizeDateText(value) {
  if (!value) {
    return ''
  }

  return String(value)
    .trim()
    .replace(
      /(\d{2}:\d{2}:)(\d)(\s+\+0000)$/u,
      (_, prefix, second, suffix) => `${prefix}0${second}${suffix}`,
    )
}

export function formatLocalDateTime(value, fallback = 'Não informada') {
  const normalizedValue = normalizeDateText(value)

  if (!normalizedValue) {
    return fallback
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/u.test(normalizedValue)
  const parsedDate = new Date(
    isDateOnly ? `${normalizedValue}T00:00:00` : normalizedValue,
  )

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue
  }

  return ptBrLocalDateTimeFormatter.format(parsedDate)
}
