'use client'

import { useState, type ReactNode } from 'react'
import { Menu, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import type { Role } from '@/lib/auth/roles'
import { ROLE_LABELS } from '@/lib/auth/roles'
import { OperatorIdentityModal } from '@/components/layout/operator-identity'

interface TopNavProps {
  user?: User | null
  role?: Role
  breadcrumb?: ReactNode
  onMenuClick?: () => void
}

function UserAvatar({ email }: { email: string }) {
  const initials = email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white select-none"
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export function TopNav({ user, role, breadcrumb, onMenuClick }: TopNavProps) {
  const [notifOpen, setNotifOpen] = useState(false)

  const userEmail = user?.email ?? ''

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Left: hamburger (mobile) + breadcrumb slot */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden -ml-1 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb / page title slot */}
        {breadcrumb && (
          <div className="min-w-0 truncate text-sm text-gray-600">
            {breadcrumb}
          </div>
        )}
      </div>

      {/* Right: notifications + operator attribution */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className={cn(
              'relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
            )}
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            {/* Unread indicator dot — placeholder, wire up real count later */}
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
          </button>

          {/* Dropdown stub */}
          {notifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Notifications
              </p>
              <div className="px-4 py-3 text-sm text-gray-500 italic">
                No new notifications.
              </div>
            </div>
          )}
        </div>

        {/* User avatar + info */}
        <div className="flex items-center gap-2">
          <UserAvatar email={userEmail} />
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
              {userEmail || 'Guest'}
            </p>
            {role && (
              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
          </div>
        </div>

        <OperatorIdentityModal />
      </div>
    </header>
  )
}
