import { Suspense } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { getMyNotifications, markAllNotificationsRead } from '@/actions/notifications'

export const metadata = { title: 'Notifications — SMLS' }

function entityHref(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'requirement':    return `/requirements/${entityId}`
    case 'purchase_order': return `/procurement/purchase-orders/${entityId}`
    case 'payment':        return `/procurement/purchase-orders/${entityId}`
    default:               return '#'
  }
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function groupNotifications(items: any[]) {
  const today: any[] = [], thisWeek: any[] = [], older: any[] = []
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek  = new Date(startOfToday.getTime() - 6 * 86400_000)

  for (const n of items) {
    const d = new Date(n.created_at)
    if (d >= startOfToday)     today.push(n)
    else if (d >= startOfWeek) thisWeek.push(n)
    else                       older.push(n)
  }
  return { today, thisWeek, older }
}

async function NotificationsList() {
  const all = await getMyNotifications()
  const { today, thisWeek, older } = groupNotifications(all)
  const unread = all.filter((n: any) => !n.is_read).length

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Bell className="h-10 w-10 mb-3" />
        <p className="text-lg font-medium text-gray-500">No notifications yet</p>
        <p className="text-sm">You'll be notified here when requirements are approved, items arrive, and more.</p>
      </div>
    )
  }

  const Section = ({ title, items }: { title: string; items: any[] }) => {
    if (!items.length) return null
    return (
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
          {items.map((n: any) => (
            <Link
              key={n.id}
              href={entityHref(n.entity_type, n.entity_id)}
              className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50 hover:bg-blue-50/70' : ''}`}
            >
              <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${n.is_read ? 'bg-gray-200' : 'bg-blue-500'}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug text-gray-800 ${!n.is_read ? 'font-semibold' : ''}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                )}
                <p className="mt-1 text-[11px] text-gray-400">{timeLabel(n.created_at)}</p>
              </div>
              <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            </Link>
          ))}
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Mark all read form */}
      {unread > 0 && (
        <form
          action={async () => {
            'use server'
            await markAllNotificationsRead()
          }}
          className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <p className="text-sm text-blue-800 font-medium">
            You have <span className="font-bold">{unread}</span> unread notification{unread !== 1 ? 's' : ''}.
          </p>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </form>
      )}

      <Section title="Today" items={today} />
      <Section title="This Week" items={thisWeek} />
      <Section title="Older" items={older} />
    </>
  )
}

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Bell className="h-6 w-6 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Status updates, approvals, and inventory alerts</p>
        </div>
      </div>

      <Suspense fallback={
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      }>
        <NotificationsList />
      </Suspense>
    </div>
  )
}
