'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Save, Mail, Building2, DollarSign, X, Plus } from 'lucide-react'
import { upsertSystemSettings } from '@/actions/settings'

interface SystemSettingsFormProps {
  initial: Record<string, string>
}

function parseEmails(raw: string): string[] {
  return raw.split(',').map((e) => e.trim()).filter(Boolean)
}

function EmailTagInput({
  emails,
  onChange,
}: {
  emails: string[]
  onChange: (emails: string[]) => void
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addEmail = (raw: string) => {
    const val = raw.trim().toLowerCase()
    if (!val) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(val)) {
      setError(`"${val}" is not a valid email address.`)
      return
    }
    if (emails.includes(val)) {
      setError(`"${val}" is already in the list.`)
      return
    }
    setError(null)
    onChange([...emails, val])
    setInput('')
  }

  const removeEmail = (email: string) => {
    onChange(emails.filter((e) => e !== email))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addEmail(input)
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      removeEmail(emails[emails.length - 1])
    }
  }

  return (
    <div>
      <div
        className="min-h-[42px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-800"
          >
            <Mail className="h-3 w-3 shrink-0" />
            {email}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeEmail(email) }}
              className="ml-0.5 rounded-full text-blue-500 hover:text-blue-800 hover:bg-blue-200 focus:outline-none"
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center flex-1 min-w-[200px]">
          <input
            ref={inputRef}
            type="email"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null) }}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) addEmail(input) }}
            placeholder={emails.length === 0 ? 'finance@company.com, accounts@company.com…' : 'Add another email…'}
            className="flex-1 text-sm text-gray-900 bg-transparent focus:outline-none py-0.5 placeholder:text-gray-400"
          />
          {input.trim() && (
            <button
              type="button"
              onClick={() => addEmail(input)}
              className="ml-1 inline-flex items-center gap-0.5 rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1.5 text-xs text-gray-400">
        Press <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> or <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">,</kbd> to add. Click <X className="inline h-3 w-3" /> to remove.
      </p>
    </div>
  )
}

export default function SystemSettingsForm({ initial }: SystemSettingsFormProps) {
  const [accountsEmails, setAccountsEmails] = useState<string[]>(
    parseEmails(initial.accounts_emails ?? '')
  )
  const [values, setValues] = useState({
    company_name: initial.company_name ?? '',
    company_gst: initial.company_gst ?? '',
    default_currency: initial.default_currency ?? 'USD',
    po_due_days: initial.po_due_days ?? '3',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }))
    setMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const result = await upsertSystemSettings({
        ...values,
        accounts_emails: accountsEmails.join(', '),
      })
      if (result.success) {
        setMsg({ type: 'success', text: `Settings saved. ${accountsEmails.length} accounts email${accountsEmails.length !== 1 ? 's' : ''} configured.` })
      } else {
        setMsg({ type: 'error', text: typeof result.error === 'string' ? result.error : 'Save failed.' })
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message ?? 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'block text-sm font-medium text-gray-700'

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Accounts / Finance Team */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Accounts / Finance Email Recipients</h2>
          </div>
          {accountsEmails.length > 0 && (
            <span className="rounded-full bg-green-100 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              {accountsEmails.length} configured
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          These addresses receive an email via SendGrid whenever a requirement is approved.
          Each person can then create a Purchase Order.
        </p>
        <div>
          <label className={labelCls + ' mb-1'}>Recipient Emails</label>
          <EmailTagInput
            emails={accountsEmails}
            onChange={(emails) => { setAccountsEmails(emails); setMsg(null) }}
          />
        </div>
        {accountsEmails.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-center gap-2">
            <span className="text-amber-500">⚠️</span>
            No emails configured — accounts team will <strong>not</strong> be notified when requirements are approved.
          </div>
        )}
      </div>

      {/* Company Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Company Information</h2>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Used in Purchase Order documents and email footers.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Company Name</label>
            <input
              type="text"
              value={values.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="Bennet & Bernard Ltd."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>GST / Tax Registration No.</label>
            <input
              type="text"
              value={values.company_gst}
              onChange={(e) => handleChange('company_gst', e.target.value)}
              placeholder="GST-123456789"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Defaults */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Workflow Defaults</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Default Currency</label>
            <select
              value={values.default_currency}
              onChange={(e) => handleChange('default_currency', e.target.value)}
              className={inputCls}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SGD">SGD</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Approval Due Days</label>
            <input
              type="number"
              min={1}
              max={30}
              value={values.po_due_days}
              onChange={(e) => handleChange('po_due_days', e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">
              Days from submission until approval is due.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  )
}
