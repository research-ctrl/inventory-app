import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata = { title: 'Admin Portal | SMLS' }

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Admin Portal</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">SMLS System Administration</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}
