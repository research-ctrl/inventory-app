'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  Building2,
  ShoppingCart,
  CreditCard,
  Truck,
  PackageCheck,
  FlaskConical,
  Package,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Settings,
  CircleHelp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/auth/roles'
import { ROLE_LABELS } from '@/lib/auth/roles'

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { label: 'Requirements',    href: '/requirements',                  icon: ClipboardList },
      { label: 'Approvals',       href: '/approvals',                     icon: CheckSquare },
      { label: 'Vendors',         href: '/vendors',                       icon: Building2 },
      { label: 'Purchase Orders', href: '/procurement/purchase-orders',   icon: ShoppingCart },
      { label: 'Payments',        href: '/procurement/payments',          icon: CreditCard },
      { label: 'Deliveries',      href: '/procurement/deliveries',        icon: Truck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Receiving',  href: '/receiving',  icon: PackageCheck },
      { label: 'QC',         href: '/qc',         icon: FlaskConical },
      { label: 'Inventory',  href: '/inventory',  icon: Package },
      { label: 'Issues',     href: '/issues',     icon: AlertTriangle },
      { label: 'Recovery',   href: '/recovery',   icon: RefreshCw },
    ],
  },
  {
    label: 'AI & Reports',
    items: [
      { label: 'Chatbot', href: '/chatbot', icon: MessageSquare },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Help', href: '/help', icon: CircleHelp },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  role?: Role
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo / Brand */}
      <div className="flex h-16 flex-shrink-0 items-center border-b border-gray-200 px-5">
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">SMLS</p>
          <p className="text-xs text-gray-400 leading-tight">Shipyard Material Lifecycle</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          active ? 'text-blue-600' : 'text-gray-400',
                        )}
                      />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Role indicator at the bottom */}
      {role && (
        <div className="flex-shrink-0 border-t border-gray-200 px-5 py-3">
          <p className="text-xs text-gray-400">Signed in as</p>
          <p className="text-xs font-medium text-gray-700 truncate">
            {ROLE_LABELS[role] ?? role}
          </p>
        </div>
      )}
    </aside>
  )
}
