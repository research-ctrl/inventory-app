import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminUsersTable from '@/components/admin/admin-users-table'
import { BootstrapClaim } from '@/components/admin-portal/bootstrap-claim'
import { ShieldCheck, Users, Settings, LogOut } from 'lucide-react'
import { signOutAction } from '@/actions/auth'

export const metadata = { title: 'Admin Portal | SMLS' }

export default async function AdminPortalPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) redirect('/admin-portal/sign-in')

  const adminSb = createAdminClient()

  const { data: currentProfile } = await adminSb
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single()

  const { count: adminCount } = await adminSb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['super_admin', 'admin'])

  const isBootstrap = (adminCount ?? 0) === 0
  const isAdmin = ['super_admin', 'admin'].includes(currentProfile?.role ?? '')

  // Not an admin and not in bootstrap mode → deny
  if (!isAdmin && !isBootstrap) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <ShieldCheck className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Access Denied</p>
            <p className="text-sm text-gray-500 mt-1">
              You need <strong>Admin</strong> or <strong>Super Admin</strong> role to access this portal.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Current role: <strong>{currentProfile?.role ?? 'viewer'}</strong>
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back to App
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-100 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Bootstrap mode: let the user claim super_admin
  if (!isAdmin && isBootstrap) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <BootstrapClaim email={user.email ?? ''} />
        </div>
      </div>
    )
  }

  // Fetch all profiles for admin view
  const { data: profiles } = await (adminSb
    .from('profiles')
    .select('id, full_name, email, role, department, phone_number, designation')
    .order('full_name', { ascending: true }) as any)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage users, roles, and system configuration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-900">
              {currentProfile?.full_name ?? user.email}
            </p>
            <p className="text-[10px] text-gray-400 capitalize">
              {currentProfile?.role?.replace('_', ' ') ?? 'unknown'}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { label: 'Users', icon: Users, href: '/admin-portal', active: true },
          { label: 'Settings', icon: Settings, href: '/admin-portal/settings', active: false },
        ].map(({ label, icon: Icon, href, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Users table */}
      <AdminUsersTable
        profiles={profiles ?? []}
        currentUserId={user.id}
        isBootstrapMode={isBootstrap}
      />
    </div>
  )
}
