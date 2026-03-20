'use client'
import { useEffect, useState } from 'react'
import { getOperatorProfiles } from '@/actions/operator'
import type { Operator } from '@/lib/operator'
import { ROLE_LABELS } from '@/lib/auth/roles'

export function OperatorModal({ onSelect }: { onSelect: (op: Operator) => void }) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    getOperatorProfiles()
      .then(p => { setProfiles(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSelect = (profile: any) => {
    setSelected(profile.id)
    onSelect({
      id: profile.id,
      name: profile.full_name ?? profile.email,
      role: profile.role,
      email: profile.email,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl mx-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Who are you today?</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select your profile to proceed. This is for attribution and audit trail only.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm">No profiles found. Check database seed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleSelect(profile)}
                className={`rounded-xl border-2 p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected === profile.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
                </div>
                <p className="mt-2 text-sm font-semibold leading-tight text-gray-900">
                  {profile.full_name ?? profile.email}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {(ROLE_LABELS as any)[profile.role] ?? profile.role}
                </p>
                {profile.department && (
                  <p className="text-xs text-gray-400">{profile.department}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
