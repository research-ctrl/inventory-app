import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPortalSignUpForm } from '@/components/admin-portal/admin-portal-sign-up-form'

export const metadata = { title: 'Admin Setup | SMLS' }

export default async function AdminPortalSignUpPage() {
  const adminSb = createAdminClient()

  const { count } = await adminSb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['super_admin', 'admin'])

  const isBootstrap = (count ?? 0) === 0

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">First-Time Setup</h1>
          <p className="text-sm text-gray-500">Create the first super admin account</p>
        </div>

        {isBootstrap ? (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <strong>Bootstrap mode active</strong> — no admins exist yet.
              The account you create here will become <strong>Super Admin</strong>.
            </div>
            <AdminPortalSignUpForm />
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center space-y-2">
            <p className="text-sm font-semibold text-amber-900">Bootstrap Locked</p>
            <p className="text-xs text-amber-700">
              Admin accounts already exist. New admins must be created by an existing super admin
              from within the admin portal.
            </p>
            <Link
              href="/admin-portal/sign-in"
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              Sign in instead →
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link href="/admin-portal/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
