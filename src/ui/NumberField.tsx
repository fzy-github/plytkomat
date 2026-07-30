import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

/**
 * Pole liczbowe w cm: edycja lokalna, zatwierdzenie na blur/Enter z clampem
 * do [min, max]; wartość nieparsowalna wraca do poprzedniej.
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  unit = 'cm',
}: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (Number.isNaN(parsed)) {
      setText(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, parsed))
    setText(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <label className="number-field">
      <span className="number-field-label">{label}</span>
      <span className="number-field-control">
        <input
          type="number"
          value={text}
          min={min}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
        <span className="number-field-unit">{unit}</span>
      </span>
    </label>
  )
}
