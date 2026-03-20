'use client'

import { useEffect, useMemo, useState } from 'react'
import { PencilLine, UserRound } from 'lucide-react'

const STORAGE_KEY = 'smls.prototype.operator'

type OperatorIdentity = {
  name: string
  team: string
  badge: string
}

const DEFAULT_IDENTITY: OperatorIdentity = {
  name: '',
  team: 'Stores',
  badge: '',
}

function readStoredIdentity(): OperatorIdentity {
  if (typeof window === 'undefined') return DEFAULT_IDENTITY

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_IDENTITY
    const parsed = JSON.parse(raw) as Partial<OperatorIdentity>
    return {
      name: parsed.name?.trim() ?? '',
      team: parsed.team?.trim() ?? 'Stores',
      badge: parsed.badge?.trim() ?? '',
    }
  } catch {
    return DEFAULT_IDENTITY
  }
}

function persistIdentity(identity: OperatorIdentity) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  window.dispatchEvent(new CustomEvent('prototype-operator-updated', { detail: identity }))
}

export function OperatorIdentityModal() {
  const [open, setOpen] = useState(false)
  const [identity, setIdentity] = useState<OperatorIdentity>(DEFAULT_IDENTITY)

  useEffect(() => {
    const stored = readStoredIdentity()
    setIdentity(stored)
    if (!stored.name) setOpen(true)
  }, [])

  const canSave = identity.name.trim().length > 1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        <UserRound className="h-4 w-4" />
        <span>{identity.name ? `${identity.name} · ${identity.team || 'No team'}` : 'Set operator identity'}</span>
        <PencilLine className="h-3.5 w-3.5 text-slate-500" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Prototype operator identity</p>
              <h2 className="text-xl font-semibold text-slate-900">Who is operating this workstation?</h2>
              <p className="text-sm text-slate-600">
                This is stored only in localStorage and used for attribution on workflow actions. It does not control access.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Operator name</span>
                <input
                  value={identity.name}
                  onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-blue-500"
                  placeholder="e.g. Maria Santos"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Team / desk</span>
                <input
                  value={identity.team}
                  onChange={(event) => setIdentity((current) => ({ ...current, team: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-blue-500"
                  placeholder="Stores, QC, Shipbuilder Ops…"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Badge / call sign</span>
                <input
                  value={identity.badge}
                  onChange={(event) => setIdentity((current) => ({ ...current, badge: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-blue-500"
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => {
                  if (!canSave) return
                  persistIdentity(identity)
                  setOpen(false)
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Save identity
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function OperatorAttributionFields() {
  const [identity, setIdentity] = useState<OperatorIdentity>(DEFAULT_IDENTITY)

  useEffect(() => {
    const sync = () => setIdentity(readStoredIdentity())
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('prototype-operator-updated', sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('prototype-operator-updated', sync as EventListener)
    }
  }, [])

  const values = useMemo(() => identity, [identity])

  return (
    <>
      <input type="hidden" name="operatorName" value={values.name} readOnly />
      <input type="hidden" name="operatorTeam" value={values.team} readOnly />
      <input type="hidden" name="operatorBadge" value={values.badge} readOnly />
    </>
  )
}
