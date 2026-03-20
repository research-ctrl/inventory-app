'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CreateVendorSchema, type CreateVendorInput } from '@/lib/validations/vendor'
import { createVendor, updateVendor } from '@/actions/vendors'

interface VendorFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<CreateVendorInput> & { id?: string }
  onSuccess?: () => void
}

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'paint', label: 'Paint' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'safety', label: 'Safety' },
  { value: 'general', label: 'General' },
] as const

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
] as const

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

const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'

const selectCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50'

export default function VendorForm({ mode, initialData, onSuccess }: VendorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateVendorInput>({
    resolver: zodResolver(CreateVendorSchema) as any,
    defaultValues: {
      code: initialData?.code ?? '',
      name: initialData?.name ?? '',
      trade_name: initialData?.trade_name ?? '',
      category: initialData?.category as CreateVendorInput['category'],
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      website: initialData?.website ?? '',
      address_line1: initialData?.address_line1 ?? '',
      address_line2: initialData?.address_line2 ?? '',
      city: initialData?.city ?? '',
      country: initialData?.country ?? '',
      postal_code: initialData?.postal_code ?? '',
      payment_terms_days: initialData?.payment_terms_days ?? 30,
      currency: (initialData?.currency as CreateVendorInput['currency']) ?? 'USD',
      tax_id: initialData?.tax_id ?? '',
      notes: initialData?.notes ?? '',
    },
  })

  const onSubmit = (data: CreateVendorInput) => {
    startTransition(async () => {
      let result
      if (mode === 'create') {
        result = await createVendor(data)
      } else {
        if (!initialData?.id) return
        result = await updateVendor(initialData.id, data as any)
      }

      if (result.error) {
        const errs = result.error as Record<string, string[]>
        Object.entries(errs).forEach(([field, messages]) => {
          if (field === '_root') {
            setError('code', { message: messages[0] })
          } else {
            setError(field as keyof CreateVendorInput, { message: messages[0] })
          }
        })
        return
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/vendors')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {/* Row 1: code, name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label required>Vendor Code</Label>
          <input
            {...register('code')}
            placeholder="e.g. VND-001"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.code?.message} />
        </div>
        <div>
          <Label required>Vendor Name</Label>
          <input
            {...register('name')}
            placeholder="Full legal name"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.name?.message} />
        </div>
      </div>

      {/* Row 2: trade_name, category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Trade Name</Label>
          <input
            {...register('trade_name')}
            placeholder="Operating / trade name"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.trade_name?.message} />
        </div>
        <div>
          <Label>Category</Label>
          <select {...register('category')} className={selectCls} disabled={isPending}>
            <option value="">— Select category —</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>
      </div>

      {/* Row 3: email, phone, website */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>Email</Label>
          <input
            {...register('email')}
            type="email"
            placeholder="contact@vendor.com"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label>Phone</Label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="+1 555 000 0000"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div>
          <Label>Website</Label>
          <input
            {...register('website')}
            type="url"
            placeholder="https://vendor.com"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.website?.message} />
        </div>
      </div>

      {/* Row 4: address_line1, address_line2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Address Line 1</Label>
          <input
            {...register('address_line1')}
            placeholder="Street address"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.address_line1?.message} />
        </div>
        <div>
          <Label>Address Line 2</Label>
          <input
            {...register('address_line2')}
            placeholder="Suite, floor, building"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.address_line2?.message} />
        </div>
      </div>

      {/* Row 5: city, country, postal_code */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>City</Label>
          <input
            {...register('city')}
            placeholder="City"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.city?.message} />
        </div>
        <div>
          <Label>Country</Label>
          <input
            {...register('country')}
            placeholder="Country"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.country?.message} />
        </div>
        <div>
          <Label>Postal Code</Label>
          <input
            {...register('postal_code')}
            placeholder="ZIP / Postal code"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.postal_code?.message} />
        </div>
      </div>

      {/* Row 6: payment_terms_days, currency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Payment Terms (Days)</Label>
          <input
            {...register('payment_terms_days')}
            type="number"
            min={0}
            max={365}
            placeholder="30"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.payment_terms_days?.message} />
        </div>
        <div>
          <Label>Currency</Label>
          <select {...register('currency')} className={selectCls} disabled={isPending}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.currency?.message} />
        </div>
      </div>

      {/* Row 7: tax_id, notes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Tax ID / VAT Number</Label>
          <input
            {...register('tax_id')}
            placeholder="Tax registration number"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.tax_id?.message} />
        </div>
        <div>
          <Label>Notes</Label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any additional notes about this vendor"
            className={inputCls}
            disabled={isPending}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
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
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          {isPending ? 'Saving…' : mode === 'create' ? 'Create Vendor' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
