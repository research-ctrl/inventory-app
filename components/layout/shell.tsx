'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import type { Role } from '@/lib/auth/roles'

interface ShellProps {
  role: Role
  userName: string
  user: { id: string; email?: string | null } | null
  profile: { full_name?: string | null; role?: string | null } | null
  displayName: string
  children: React.ReactNode
}

export function Shell({ role, userName, user, profile, displayName, children }: ShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar role={role} userName={userName} />
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl lg:hidden">
            {/* Close button row */}
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">SMLS</p>
                <p className="text-xs text-gray-400 leading-tight">Shipyard Material Lifecycle</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sidebar nav — re-uses same component, hides the brand header */}
            <div className="flex-1 overflow-y-auto">
              <Sidebar role={role} userName={userName} hideBrand />
            </div>
          </div>
        </>
      )}

      {/* ── Main content column ───────────────────────────────────────────── */}
      {/* NOTE: no overflow-hidden here so TopNav dropdowns (notification bell)
          can extend past the header without being clipped */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          user={user}
          profile={profile}
          displayName={displayName}
          role={role}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
