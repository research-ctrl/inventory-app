import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
  /** Optional hint text shown below the input */
  hint?: string
  /** Optional id for the label htmlFor attribute. Inferred from label if not provided. */
  htmlFor?: string
  className?: string
}

export function FormField({
  label,
  error,
  required,
  children,
  hint,
  htmlFor,
  className,
}: FormFieldProps) {
  // Generate a stable id fallback from the label
  const id = htmlFor ?? label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
