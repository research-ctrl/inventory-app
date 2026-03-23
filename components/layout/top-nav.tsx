'use client'

import { type ReactNode } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/auth/roles'
import { ROLE_LABELS } from '@/lib/auth/roles'
import { NotificationBell } from '@/components/notifications/notification-bell'

interface TopNavProps {
  user?: { id: string; email?: string | null } | null
  profile?: { full_name?: string | null; role?: string | null } | null
  displayName?: string
  role?: Role
  breadcrumb?: ReactNode
  onMenuClick?: () => void
}

function UserAvatar({ name, email }: { name?: string | null; email?: string | null }) {
  // Use first+last name initials if available, else first two chars of email username
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : (email ?? 'U')
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

export function TopNav({ user, profile, displayName, role, breadcrumb, onMenuClick }: TopNavProps) {
  const fullName = displayName ?? profile?.full_name ?? user?.email ?? ''
  const userEmail = user?.email ?? ''

  return (
    <header className="relative z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
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

        {breadcrumb && (
          <div className="min-w-0 truncate text-sm text-gray-600">
            {breadcrumb}
          </div>
        )}
      </div>

      {/* Right: notifications + user info + sign-out */}
      <div className="flex items-center gap-3">
        {/* Notification bell (live — wired to DB) */}
        <NotificationBell />

        {/* User avatar + info */}
        <div className="flex items-center gap-2">
          <UserAvatar name={fullName !== userEmail ? fullName : null} email={userEmail} />
          <div className="hidden sm:block leading-tight">
            {/* Show full name prominently if it exists, otherwise email */}
            <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">
              {fullName || 'User'}
            </p>
            {/* Show email below full name if name is different */}
            {fullName && fullName !== userEmail && userEmail && (
              <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{userEmail}</p>
            )}
            {role && (
              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
          </div>
        </div>

        {/* Sign-out */}
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-500',
              'hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'transition-colors',
            )}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  )
}
