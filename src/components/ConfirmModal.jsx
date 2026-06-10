import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function ConfirmModal({
  open,
  title,
  description,
  options = [],
  selectedOption = '',
  onSelectOption,
  confirmLabel = 'Continuar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Ação</span>
            <h2 id="confirm-modal-title">{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {description ? <p className="modal-description">{description}</p> : null}

        {options.length > 0 ? (
          <div className="scope-options" role="radiogroup" aria-label={title}>
            {options.map((option) => (
              <label
                className={`scope-option ${
                  selectedOption === option.value ? 'is-selected' : ''
                }`}
                key={option.value}
              >
                <input
                  type="radio"
                  name="scope-option"
                  value={option.value}
                  checked={selectedOption === option.value}
                  onChange={() => onSelectOption(option.value)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`primary-button ${variant === 'danger' ? 'danger-button' : ''}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

export default ConfirmModal
