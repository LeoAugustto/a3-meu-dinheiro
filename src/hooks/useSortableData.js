import { useMemo, useState } from 'react'

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return value
  }

  const numericValue = Number(value)

  if (value !== '' && Number.isFinite(numericValue)) {
    return numericValue
  }

  return String(value).toLocaleLowerCase('pt-BR')
}

function compareValues(firstValue, secondValue) {
  const first = normalizeValue(firstValue)
  const second = normalizeValue(secondValue)

  if (typeof first === 'number' && typeof second === 'number') {
    return first - second
  }

  return String(first).localeCompare(String(second), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  })
}

export function useSortableData(items, sortOptions, initialSort) {
  const [sortConfig, setSortConfig] = useState(
    initialSort || {
      key: sortOptions[0]?.key || '',
      direction: 'desc',
    },
  )

  const sortedItems = useMemo(() => {
    const option = sortOptions.find((item) => item.key === sortConfig.key)

    if (!option) {
      return items
    }

    return [...items].sort((firstItem, secondItem) => {
      const firstValue = option.getValue(firstItem)
      const secondValue = option.getValue(secondItem)
      const result = compareValues(firstValue, secondValue)

      return sortConfig.direction === 'asc' ? result : -result
    })
  }, [items, sortConfig, sortOptions])

  function requestSort(key) {
    setSortConfig((currentConfig) => {
      if (currentConfig.key === key) {
        return {
          key,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return { key, direction: 'asc' }
    })
  }

  function updateSort(key, direction = sortConfig.direction) {
    setSortConfig({ key, direction })
  }

  return {
    sortedItems,
    sortConfig,
    requestSort,
    updateSort,
  }
}
