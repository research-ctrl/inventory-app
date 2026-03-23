'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { claimSuperAdmin } from '@/actions/admin-auth'

interface BootstrapClaimProps {
  email: string
}

export function BootstrapClaim({ email }: BootstrapClaimProps) {
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const [isPending, startTransition]  = useTransition()
  const router                        = useRouter()

  function handleClaim() {
    setError(null)
    startTransition(async () => {
      const result = await claimSuperAdmin()
      if (!result.success) {
        setError(result.error ?? 'Failed to claim super admin.')
        return
      }
      setSuccess(true)
      setTimeout(() => router.refresh(), 1000)
    })
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-blue-900">Bootstrap Mode Active</p>
        <p className="text-xs text-blue-700 mt-1">
          No admins have been set up yet. You are signed in as{' '}
          <strong>{email}</strong>. Click below to claim Super Admin access.
        </p>
      </div>

      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Super Admin granted! Refreshing…
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={handleClaim}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Claiming…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Claim Super Admin
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}
