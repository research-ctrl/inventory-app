'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { PaymentSchema, type PaymentInput } from '@/lib/validations/po'
import { createPayment } from '@/actions/purchase-orders'

interface PaymentFormProps {
  poId: string
  poNumber: string
  remainingAmount: number
  onSuccess?: () => void
}

const PAYMENT_METHODS = [
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'letter_of_credit', label: 'Letter of Credit' },
] as const

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD'] as const

const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50'

const selectCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

// Generate a payment reference suggestion
function generatePaymentRef(poNumber: string): string {
  const date = new Date()
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const clean = poNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8)
  return `PAY-${clean}-${yyyymm}`
}

export default function PaymentForm({
  poId,
  poNumber,
  remainingAmount,
  onSuccess,
}: PaymentFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(PaymentSchema) as any,
    defaultValues: {
      po_id: poId,
      payment_ref: generatePaymentRef(poNumber),
      amount: remainingAmount > 0 ? remainingAmount : undefined,
      currency: 'USD',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'wire',
      bank_reference: '',
      notes: '',
    },
  })

  const onSubmit = (data: PaymentInput) => {
    startTransition(async () => {
      const result = await createPayment(data)
      if (!result.success) {
        if (typeof result.error === 'string') {
          setError('amount', { message: result.error })
        } else {
          const errs = result.error as Record<string, string[]>
          Object.entries(errs).forEach(([field, messages]) => {
            setError(field as keyof PaymentInput, { message: messages[0] })
          })
        }
        return
      }
      reset()
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
      <input type="hidden" {...register('po_id')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Payment Reference */}
        <div>
          <Label required>Payment Reference</Label>
          <input
            {...register('payment_ref')}
            placeholder="PAY-..."
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.payment_ref?.message} />
        </div>

        {/* Amount */}
        <div>
          <Label required>Amount</Label>
          <div className="relative">
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              min={0.01}
              placeholder="0.00"
              className={`${inputCls} pr-20`}
              disabled={isPending}
            />
            {remainingAmount > 0 && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-xs text-gray-400">
                  max {remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
          <FieldError message={errors.amount?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Currency */}
        <div>
          <Label>Currency</Label>
          <select {...register('currency')} className={selectCls} disabled={isPending}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError message={errors.currency?.message} />
        </div>

        {/* Payment Date */}
        <div>
          <Label>Payment Date</Label>
          <input
            {...register('payment_date')}
            type="date"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.payment_date?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Payment Method */}
        <div>
          <Label required>Payment Method</Label>
          <select {...register('payment_method')} className={selectCls} disabled={isPending}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <FieldError message={errors.payment_method?.message} />
        </div>

        {/* Bank Reference */}
        <div>
          <Label>Bank Reference</Label>
          <input
            {...register('bank_reference')}
            placeholder="Bank transaction ID"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.bank_reference?.message} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Any notes about this payment"
          className={inputCls}
          disabled={isPending}
        />
        <FieldError message={errors.notes?.message} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSuccess?.()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Record Payment'}
        </button>
      </div>
    </form>
  )
}
