import Link from 'next/link'

export const metadata = { title: 'Prototype access | SMLS' }

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Prototype access is open</h1>
          <p className="text-sm text-slate-600">
            This prototype does not use sign-in or sign-up. Open the dashboard directly and set operator attribution from the identity modal.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
