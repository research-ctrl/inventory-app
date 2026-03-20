'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CreatePurchaseOrderSchema, type CreatePurchaseOrderInput } from '@/lib/validations/po'
import { createPurchaseOrder } from '@/actions/purchase-orders'

interface VendorRow {
  id: string
  code: string
  name: string
  category: string | null
  currency: string | null
  payment_terms_days: number | null
}

interface RequirementRow {
  id: string
  ref_number?: string | null
  title?: string | null
}

interface PoFormProps {
  vendors: VendorRow[]
  requirements?: RequirementRow[]
  initialRequirement?: { id: string; ref_number: string; title: string } | null
  onSuccess?: () => void
}

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP'] as const
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

function computeLineTotal(
  quantity: number,
  unitPrice: number,
  discountRate: number,
  taxRate: number
): number {
  return quantity * unitPrice * (1 - discountRate / 100) * (1 + taxRate / 100)
}

export default function PoForm({
  vendors,
  requirements,
  initialRequirement,
  onSuccess,
}: PoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    watch,
    setError,
    control,
    formState: { errors },
  } = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(CreatePurchaseOrderSchema) as any,
    defaultValues: {
      requirement_id: initialRequirement?.id ?? null,
      vendor_id: '',
      payment_terms: '',
      delivery_address: '',
      incoterms: 'FOB',
      currency: 'USD',
      expected_delivery: null,
      notes: '',
      items: [
        {
          line_number: 1,
          description: '',
          part_number: '',
          quantity: 1,
          unit: 'pcs',
          unit_price: 0,
          currency: 'USD',
          tax_rate: 0,
          discount_rate: 0,
          notes: '',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems = watch('items')
  const currency = watch('currency')

  const runningTotal = useMemo(() => {
    return (watchedItems ?? []).reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.unit_price) || 0
      const tax = Number(item.tax_rate) || 0
      const disc = Number(item.discount_rate) || 0
      return sum + computeLineTotal(qty, price, disc, tax)
    }, 0)
  }, [watchedItems])

  function fmtCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const onSubmit = (data: CreatePurchaseOrderInput) => {
    startTransition(async () => {
      const result = await createPurchaseOrder(data)
      if (!result.success) {
        if (typeof result.error === 'string') {
          setError('vendor_id', { message: result.error })
        } else {
          const errs = result.error as Record<string, string[]>
          Object.entries(errs).forEach(([field, messages]) => {
            setError(field as any, { message: messages[0] })
          })
        }
        return
      }
      if (onSuccess) {
        onSuccess()
      } else if (result.data?.id) {
        router.push(`/procurement/purchase-orders/${result.data.id}`)
      } else {
        router.push('/procurement/purchase-orders')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
      {/* PO Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <h3 className="text-base font-semibold text-gray-900">Purchase Order Details</h3>

        {/* Requirement + Vendor */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {requirements && (
            <div>
              <Label>Linked Requirement</Label>
              <select {...register('requirement_id')} className={selectCls} disabled={isPending}>
                <option value="">— No linked requirement —</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ref_number} — {r.title}
                  </option>
                ))}
              </select>
              <FieldError message={errors.requirement_id?.message} />
            </div>
          )}
          <div>
            <Label required>Vendor</Label>
            <select {...register('vendor_id')} className={selectCls} disabled={isPending}>
              <option value="">— Select vendor —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  [{v.code}] {v.name}
                  {v.category ? ` — ${v.category}` : ''}
                </option>
              ))}
            </select>
            <FieldError message={errors.vendor_id?.message} />
          </div>
        </div>

        {/* Payment Terms + Incoterms */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Payment Terms</Label>
            <input
              {...register('payment_terms')}
              placeholder="e.g. Net 30"
              className={inputCls}
              disabled={isPending}
            />
            <FieldError message={errors.payment_terms?.message} />
          </div>
          <div>
            <Label>Incoterms</Label>
            <select {...register('incoterms')} className={selectCls} disabled={isPending}>
              {INCOTERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <FieldError message={errors.incoterms?.message} />
          </div>
        </div>

        {/* Currency + Expected Delivery */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Currency</Label>
            <select {...register('currency')} className={selectCls} disabled={isPending}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <FieldError message={errors.currency?.message} />
          </div>
          <div>
            <Label>Expected Delivery</Label>
            <input
              {...register('expected_delivery')}
              type="date"
              className={inputCls}
              disabled={isPending}
            />
            <FieldError message={errors.expected_delivery?.message} />
          </div>
        </div>

        {/* Delivery Address */}
        <div>
          <Label>Delivery Address</Label>
          <textarea
            {...register('delivery_address')}
            rows={2}
            placeholder="Delivery address for this order"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.delivery_address?.message} />
        </div>

        {/* Notes */}
        <div>
          <Label>Notes</Label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Any additional instructions or notes"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Line Items
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({fields.length} item{fields.length !== 1 ? 's' : ''})
            </span>
          </h3>
          <button
            type="button"
            onClick={() =>
              append({
                line_number: fields.length + 1,
                description: '',
                part_number: '',
                quantity: 1,
                unit: 'pcs',
                unit_price: 0,
                currency: currency ?? 'USD',
                tax_rate: 0,
                discount_rate: 0,
                notes: '',
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isPending}
          >
            <Plus className="h-4 w-4" />
            Add Line
          </button>
        </div>

        <FieldError message={errors.items?.root?.message ?? (errors.items as any)?.message} />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Description *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part No.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Qty *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Unit Price *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Tax %</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Disc %</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Line Total</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((field, index) => {
                const item = watchedItems?.[index] ?? {}
                const qty = Number(item.quantity) || 0
                const price = Number(item.unit_price) || 0
                const tax = Number(item.tax_rate) || 0
                const disc = Number(item.discount_rate) || 0
                const lineTotal = computeLineTotal(qty, price, disc, tax)

                return (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">{index + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.description`)}
                        placeholder="Item description"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                      <FieldError message={errors.items?.[index]?.description?.message} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.part_number`)}
                        placeholder="Part #"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="1"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                      <FieldError message={errors.items?.[index]?.quantity?.message} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.unit`)}
                        placeholder="pcs"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.unit_price`)}
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0.00"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                      <FieldError message={errors.items?.[index]?.unit_price?.message} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.tax_rate`)}
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        placeholder="0"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${index}.discount_rate`)}
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        placeholder="0"
                        className="block w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isPending}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {fmtCurrency(lineTotal)}
                    </td>
                    <td className="px-3 py-2">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={8} className="px-3 py-3 text-right text-sm font-semibold text-gray-700">
                  Total
                </td>
                <td className="px-3 py-3 text-right text-base font-bold text-gray-900">
                  {fmtCurrency(runningTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          {isPending ? 'Creating PO…' : 'Create Purchase Order'}
        </button>
      </div>
    </form>
  )
}
