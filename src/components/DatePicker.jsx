import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '../utils/finance'

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function getTodayValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    const today = new Date()
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    }
  }

  const [year, month, day] = value.split('-').map(Number)
  return { year, month: month - 1, day }
}

function formatDateValue(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const firstWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const previousMonthDays = new Date(year, month, 0).getDate()
  const days = []

  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    days.push({
      day: previousMonthDays - index,
      monthOffset: -1,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ day, monthOffset: 0 })
  }

  while (days.length % 7 !== 0 || days.length < 42) {
    days.push({
      day: days.length - firstWeekday - daysInMonth + 1,
      monthOffset: 1,
    })
  }

  return days
}

function getPopoverPosition(anchor) {
  if (typeof window === 'undefined' || !anchor) {
    return { top: 0, left: 0, width: 320 }
  }

  const margin = 12
  const rect = anchor.getBoundingClientRect()
  const width = Math.max(280, Math.min(340, window.innerWidth - margin * 2))
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, window.innerWidth - width - margin),
  )
  const estimatedHeight = 380
  const bottomTop = rect.bottom + 8
  const preferredTop =
    bottomTop + estimatedHeight > window.innerHeight
      ? rect.top - estimatedHeight - 8
      : bottomTop
  const maxTop = Math.max(margin, window.innerHeight - estimatedHeight - margin)
  const top = Math.min(Math.max(margin, preferredTop), maxTop)

  return { top, left, width }
}

function DatePicker({
  value,
  onChange,
  allowClear = false,
  placeholder = 'Selecionar data',
  ariaLabel = 'Selecionar data',
}) {
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const parsedDate = useMemo(() => parseDateValue(value), [value])
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState({
    year: parsedDate.year,
    month: parsedDate.month,
  })
  const [popoverPosition, setPopoverPosition] = useState({
    top: 0,
    left: 0,
    width: 320,
  })
  const todayValue = getTodayValue()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(viewDate.year, viewDate.month, 1))
  const calendarDays = getCalendarDays(viewDate.year, viewDate.month)
  const selectedLabel = value ? formatDate(value) : placeholder

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function updatePosition() {
      setPopoverPosition(getPopoverPosition(triggerRef.current))
    }

    function handlePointerDown(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
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

  function togglePicker() {
    if (!isOpen) {
      setViewDate({ year: parsedDate.year, month: parsedDate.month })
    }

    setIsOpen((currentValue) => !currentValue)
  }

  function moveMonth(amount) {
    setViewDate((currentDate) => {
      const nextDate = new Date(currentDate.year, currentDate.month + amount, 1)

      return {
        year: nextDate.getFullYear(),
        month: nextDate.getMonth(),
      }
    })
  }

  function selectDay(day, monthOffset = 0) {
    const selectedDate = new Date(viewDate.year, viewDate.month + monthOffset, day)
    onChange(
      formatDateValue(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      ),
    )
    setIsOpen(false)
  }

  function selectToday() {
    onChange(todayValue)
    setIsOpen(false)
  }

  function clearDate() {
    onChange('')
    setIsOpen(false)
  }

  const popover =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="date-picker-popover"
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel}
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              width: `${popoverPosition.width}px`,
            }}
          >
            <div className="date-picker-month">
              <button
                className="icon-button"
                type="button"
                aria-label="Mês anterior"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={17} />
              </button>
              <strong>{monthLabel}</strong>
              <button
                className="icon-button"
                type="button"
                aria-label="Próximo mês"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="date-picker-weekdays" aria-hidden="true">
              {weekDays.map((weekDay, index) => (
                <span key={`${weekDay}-${index}`}>{weekDay}</span>
              ))}
            </div>

            <div className="date-picker-grid">
              {calendarDays.map((calendarDay, index) => {
                const currentDate = new Date(
                  viewDate.year,
                  viewDate.month + calendarDay.monthOffset,
                  calendarDay.day,
                )
                const dayValue = formatDateValue(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  currentDate.getDate(),
                )
                const isSelected = dayValue === value
                const isToday = dayValue === todayValue

                return (
                  <button
                    className={`date-option ${
                      calendarDay.monthOffset === 0 ? '' : 'is-muted'
                    } ${isSelected ? 'is-selected' : ''} ${
                      isToday ? 'is-current' : ''
                    }`}
                    type="button"
                    key={`${dayValue}-${index}`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      selectDay(calendarDay.day, calendarDay.monthOffset)
                    }
                  >
                    {calendarDay.day}
                  </button>
                )
              })}
            </div>

            <div className="date-picker-footer">
              {allowClear ? (
                <button className="secondary-button" type="button" onClick={clearDate}>
                  Limpar
                </button>
              ) : null}
              <button className="secondary-button" type="button" onClick={selectToday}>
                Hoje
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="date-picker">
      <button
        className={`date-picker-trigger ${value ? '' : 'is-empty'}`}
        type="button"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${ariaLabel}: ${selectedLabel}`}
        onClick={togglePicker}
      >
        <span>{selectedLabel}</span>
        <CalendarDays size={18} />
      </button>
      {popover}
    </div>
  )
}

export default DatePicker
