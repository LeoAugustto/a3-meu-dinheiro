import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, formatMonthLabel } from '../utils/finance'

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(2026, index, 1))
    .replace('.', ''),
)

function getCurrentMonthValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function parseMonthValue(value) {
  if (!value || !/^\d{4}-\d{2}$/u.test(value)) {
    const currentMonth = getCurrentMonthValue()
    const [year, month] = currentMonth.split('-').map(Number)
    return { year, month }
  }

  const [year, month] = value.split('-').map(Number)
  return { year, month }
}

function formatMonthValue(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getPopoverPosition(anchor) {
  if (typeof window === 'undefined' || !anchor) {
    return { top: 0, left: 0, width: 340 }
  }

  const margin = 12
  const rect = anchor.getBoundingClientRect()
  const width = Math.max(240, Math.min(340, window.innerWidth - margin * 2))
  const left = Math.min(
    Math.max(margin, rect.right - width),
    Math.max(margin, window.innerWidth - width - margin),
  )
  const estimatedHeight = 300
  const bottomTop = rect.bottom + 8
  const preferredTop =
    bottomTop + estimatedHeight > window.innerHeight
      ? rect.top - estimatedHeight - 8
      : bottomTop
  const maxTop = Math.max(margin, window.innerHeight - estimatedHeight - margin)
  const top = Math.min(Math.max(margin, preferredTop), maxTop)

  return { top, left, width }
}

function MonthPicker({ value, onChange }) {
  const pickerRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const selectedDate = useMemo(() => parseMonthValue(value), [value])
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate.year)
  const [popoverPosition, setPopoverPosition] = useState({
    top: 0,
    left: 0,
    width: 340,
  })
  const currentMonth = getCurrentMonthValue()
  const selectedMonthLabel = formatMonthLabel(value).toLocaleLowerCase('pt-BR')

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function updatePosition() {
      setPopoverPosition(getPopoverPosition(triggerRef.current))
    }

    function handlePointerDown(event) {
      if (
        !pickerRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function selectMonth(month) {
    onChange(formatMonthValue(viewYear, month))
    setIsOpen(false)
  }

  function selectCurrentMonth() {
    onChange(currentMonth)
    setIsOpen(false)
  }

  function togglePicker() {
    if (!isOpen) {
      setViewYear(selectedDate.year)
    }

    setIsOpen((currentValue) => !currentValue)
  }

  const popover =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="month-picker-popover"
            ref={popoverRef}
            role="dialog"
            aria-label="Selecionar mês"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              width: `${popoverPosition.width}px`,
            }}
          >
            <div className="month-picker-year">
              <button
                className="icon-button"
                type="button"
                aria-label="Ano anterior"
                onClick={() => setViewYear((currentYear) => currentYear - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <strong>{viewYear}</strong>
              <button
                className="icon-button"
                type="button"
                aria-label="Próximo ano"
                onClick={() => setViewYear((currentYear) => currentYear + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="month-picker-grid">
              {monthNames.map((monthName, index) => {
                const month = index + 1
                const monthValue = formatMonthValue(viewYear, month)
                const isSelected = monthValue === value
                const isCurrent = monthValue === currentMonth

                return (
                  <button
                    className={`month-option ${isSelected ? 'is-selected' : ''} ${
                      isCurrent ? 'is-current' : ''
                    }`}
                    type="button"
                    key={monthValue}
                    aria-pressed={isSelected}
                    onClick={() => selectMonth(month)}
                  >
                    {monthName}
                  </button>
                )
              })}
            </div>

            <div className="month-picker-footer">
              <button className="secondary-button" type="button" onClick={selectCurrentMonth}>
                Este mês
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="month-selector month-picker" ref={pickerRef}>
      <button
        className="icon-button month-nav-button previous"
        type="button"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(value, -1))}
      >
        <ChevronLeft size={18} />
      </button>

      <div className="month-picker-anchor">
        <button
          className="month-picker-trigger"
          type="button"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`Selecionar mês. Mês atual: ${selectedMonthLabel}`}
          onClick={togglePicker}
        >
          <span className="month-picker-copy">
            <span>Mês selecionado</span>
            <strong>{selectedMonthLabel}</strong>
          </span>
          <CalendarDays size={18} />
        </button>
      </div>

      <button
        className="icon-button month-nav-button next"
        type="button"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(value, 1))}
      >
        <ChevronRight size={18} />
      </button>

      <button
        className="secondary-button month-today-button"
        type="button"
        aria-label="Mês atual"
        onClick={selectCurrentMonth}
      >
        Hoje
      </button>
      {popover}
    </div>
  )
}

export default MonthPicker
