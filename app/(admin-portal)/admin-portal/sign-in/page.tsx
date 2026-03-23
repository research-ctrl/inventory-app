import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { AdminPortalSignInForm } from '@/components/admin-portal/admin-portal-sign-in-form'

export const metadata = { title: 'Admin Sign In | SMLS' }

export default function AdminPortalSignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Sign In</h1>
          <p className="text-sm text-gray-500">Sign in to access the admin portal</p>
        </div>

        <AdminPortalSignInForm />

        <p className="text-center text-xs text-gray-400">
          First time setup?{' '}
          <Link href="/admin-portal/sign-up" className="text-blue-600 hover:underline">
            Create first admin account
          </Link>
        </p>
      </div>
    </div>
  )
}
