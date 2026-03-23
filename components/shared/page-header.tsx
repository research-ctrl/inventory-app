import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  /** Badges, action buttons, etc. */
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-gray-900 leading-tight sm:text-2xl truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action slot */}
      {children && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
