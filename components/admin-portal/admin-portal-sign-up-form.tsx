'use client'

import { useState, useTransition } from 'react'
import { adminPortalBootstrapSignUp } from '@/actions/admin-auth'

export function AdminPortalSignUpForm() {
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function handleSubmit(formData: FormData) {
    const password = formData.get('password')?.toString()
    const confirm  = formData.get('confirm_password')?.toString()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await adminPortalBootstrapSignUp(formData)
      if (result?.error) setError(result.error)
    })
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="full_name" className="block text-xs font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="e.g. Myron Bennett"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@example.com"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium text-gray-700">
          Password <span className="text-gray-400 font-normal">(min 8 characters)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm_password" className="block text-xs font-medium text-gray-700">
          Confirm Password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Creating admin account…
          </span>
        ) : (
          'Create Super Admin Account'
        )}
      </button>
    </form>
  )
}
