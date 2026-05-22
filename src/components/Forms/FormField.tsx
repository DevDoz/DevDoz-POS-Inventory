import React from 'react'
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface FormFieldProps {
  id: string
  label: string
  type?: string
  placeholder?: string
  registration: UseFormRegisterReturn
  error?: FieldError
  required?: boolean
  disabled?: boolean
  hint?: string
  className?: string
}

/**
 * Reusable form field — label + input + error display.
 */
export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  placeholder,
  registration,
  error,
  required = false,
  disabled = false,
  hint,
  className = ''
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={`input ${error ? 'input-error' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        {...registration}
      />
      {hint && !error && <p className="text-xs text-text-muted mt-1">{hint}</p>}
      {error && <p className="error-text">{error.message}</p>}
    </div>
  )
}

// =====================
// SELECT FIELD
// =====================

interface FormSelectProps {
  id: string
  label: string
  registration: UseFormRegisterReturn
  options: Array<{ value: string; label: string }>
  error?: FieldError
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  label,
  registration,
  options,
  error,
  required = false,
  disabled = false,
  placeholder,
  className = ''
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <select
        id={id}
        disabled={disabled}
        className={`input ${error ? 'input-error' : ''} ${disabled ? 'opacity-60' : ''}`}
        {...registration}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="error-text">{error.message}</p>}
    </div>
  )
}

// =====================
// TEXTAREA FIELD
// =====================

interface FormTextareaProps {
  id: string
  label: string
  placeholder?: string
  registration: UseFormRegisterReturn
  error?: FieldError
  required?: boolean
  rows?: number
  className?: string
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  placeholder,
  registration,
  error,
  required = false,
  rows = 3,
  className = ''
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        className={`input resize-none ${error ? 'input-error' : ''}`}
        {...registration}
      />
      {error && <p className="error-text">{error.message}</p>}
    </div>
  )
}
