'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMyNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/actions/notifications'
import Link from 'next/link'

type Notification = {
  id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
  entity_type: string
  entity_id: string
}

function entityHref(n: Notification): string {
  switch (n.entity_type) {
    case 'requirement':     return `/requirements/${n.entity_id}`
    case 'purchase_order':  return `/procurement/purchase-orders/${n.entity_id}`
    case 'payment':         return `/procurement/purchase-orders/${n.entity_id}`
    default:                return '/notifications'
  }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell() {
  const [open, setOpen]             = useState(false)
  const [unread, setUnread]         = useState(0)
  const [items, setItems]           = useState<Notification[]>([])
  const [loading, setLoading]       = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Load unread count on mount + every 60 s
  useEffect(() => {
    const load = () => getUnreadCount().then(setUnread).catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    getMyNotifications()
      .then((data) => setItems(data as Notification[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnread((prev) => Math.max(0, prev - 1))
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true)
    await markAllNotificationsRead()
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnread(0)
    setMarkingAll(false)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
        )}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[200] mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notifications {unread > 0 && <span className="ml-1 text-red-500">({unread})</span>}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400 italic">
                No notifications yet.
              </div>
            ) : (
              items.slice(0, 10).map((n) => (
                <Link
                  key={n.id}
                  href={entityHref(n)}
                  onClick={() => {
                    if (!n.is_read) handleRead(n.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50',
                    !n.is_read && 'bg-blue-50 hover:bg-blue-50/80',
                  )}
                >
                  {/* Unread dot */}
                  <span className={cn(
                    'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                    n.is_read ? 'bg-transparent' : 'bg-blue-500',
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('leading-snug text-gray-800', !n.is_read && 'font-semibold')}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-blue-600 hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
