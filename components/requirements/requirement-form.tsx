'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CreateRequirementSchema,
  type CreateRequirementInput,
} from '@/lib/validations/requirement';
import { createRequirement, updateRequirement } from '@/actions/requirements';

interface RequirementFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  vessels: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; code: string }>;
  onSuccess?: (data: any) => void;
}

export default function RequirementForm({
  mode,
  initialData,
  vessels,
  departments,
  onSuccess,
}: RequirementFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRequirementInput>({
    resolver: zodResolver(CreateRequirementSchema) as any,
    defaultValues: initialData
      ? {
          title: initialData.title ?? '',
          description: initialData.description ?? '',
          vessel_id: initialData.vessel_id ?? null,
          department_id: initialData.department_id ?? null,
          urgency: initialData.urgency ?? 'routine',
          required_date: initialData.required_date?.substring(0, 10) ?? null,
          budget_estimate: initialData.budget_estimate ?? null,
          currency: initialData.currency ?? 'USD',
          items:
            initialData.requirement_items?.map((item: any, idx: number) => ({
              id: item.id,
              line_number: item.line_number ?? idx + 1,
              description: item.description ?? '',
              part_number: item.part_number ?? '',
              quantity: item.quantity ?? 1,
              unit: item.unit ?? 'pcs',
              estimated_unit_price: item.estimated_unit_price ?? undefined,
              currency: item.currency ?? 'USD',
            })) ?? [
              {
                line_number: 1,
                description: '',
                part_number: '',
                quantity: 1,
                unit: 'pcs',
                currency: 'USD',
              },
            ],
        }
      : {
          title: '',
          description: '',
          vessel_id: null,
          department_id: null,
          urgency: 'routine',
          required_date: null,
          budget_estimate: null,
          currency: 'USD',
          items: [
            {
              line_number: 1,
              description: '',
              part_number: '',
              quantity: 1,
              unit: 'pcs',
              currency: 'USD',
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = async (values: CreateRequirementInput) => {
    setServerError(null);
    try {
      let result: any;
      if (mode === 'create') {
        result = await createRequirement(values);
      } else {
        const { id, ...rest } = values as any;
        result = await updateRequirement(initialData?.id ?? id, rest);
      }

      if (result && 'error' in result && result.error) {
        const errMsg =
          typeof result.error === 'string'
            ? result.error
            : JSON.stringify(result.error);
        setServerError(errMsg);
        return;
      }

      if (onSuccess) {
        onSuccess(result?.data ?? result);
      } else {
        router.push('/requirements');
      }
    } catch (err: any) {
      setServerError(err?.message ?? 'An unexpected error occurred. Please try again.');
    }
  };

  const inputClass =
    'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8" noValidate>
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Basic Details */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelClass}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title')}
              placeholder="e.g. Hydraulic pump seals — Vessel Bravo"
              className={inputClass}
            />
            {errors.title && <p className={errorClass}>{errors.title.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              placeholder="Additional context, specifications or notes…"
              className={inputClass}
            />
            {errors.description && (
              <p className={errorClass}>{errors.description.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="vessel_id" className={labelClass}>
              Vessel
            </label>
            <select id="vessel_id" {...register('vessel_id')} className={inputClass}>
              <option value="">— Select vessel —</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {errors.vessel_id && (
              <p className={errorClass}>{errors.vessel_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="department_id" className={labelClass}>
              Department
            </label>
            <select
              id="department_id"
              {...register('department_id')}
              className={inputClass}
            >
              <option value="">— Select department —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            {errors.department_id && (
              <p className={errorClass}>{errors.department_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="urgency" className={labelClass}>
              Urgency <span className="text-red-500">*</span>
            </label>
            <select id="urgency" {...register('urgency')} className={inputClass}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
            {errors.urgency && <p className={errorClass}>{errors.urgency.message}</p>}
          </div>

          <div>
            <label htmlFor="required_date" className={labelClass}>
              Required By
            </label>
            <input
              id="required_date"
              type="date"
              {...register('required_date')}
              className={inputClass}
            />
            {errors.required_date && (
              <p className={errorClass}>{errors.required_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="budget_estimate" className={labelClass}>
              Budget Estimate
            </label>
            <input
              id="budget_estimate"
              type="number"
              min={0}
              step="0.01"
              {...register('budget_estimate', { valueAsNumber: true })}
              placeholder="0.00"
              className={inputClass}
            />
            {errors.budget_estimate && (
              <p className={errorClass}>{errors.budget_estimate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="currency" className={labelClass}>
              Currency
            </label>
            <select id="currency" {...register('currency')} className={inputClass}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SGD">SGD</option>
            </select>
            {errors.currency && <p className={errorClass}>{errors.currency.message}</p>}
          </div>
        </div>
      </section>

      {/* Line Items */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Line Items <span className="text-red-500">*</span>
          </h2>
          <button
            type="button"
            onClick={() =>
              append({
                line_number: fields.length + 1,
                description: '',
                part_number: '',
                quantity: 1,
                unit: 'pcs',
                currency: 'USD',
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add Item
          </button>
        </div>

        {errors.items && !Array.isArray(errors.items) && (
          <p className={errorClass}>{(errors.items as any).message}</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">
                  Description *
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Part No.</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Qty *</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Unit *</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">
                  Est. Unit Price
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.description`)}
                      placeholder="Item description"
                      className="w-full min-w-[160px] rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.items?.[index]?.description && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.part_number`)}
                      placeholder="Optional"
                      className="w-full min-w-[100px] rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.unit`)}
                      placeholder="pcs"
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.items?.[index]?.unit && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.items[index]?.unit?.message}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      {...register(`items.${index}.estimated_unit_price`, {
                        valueAsNumber: true,
                      })}
                      placeholder="0.00"
                      className="w-28 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-600 text-xs"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => router.push('/requirements')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </>
          ) : mode === 'create' ? (
            'Create Requirement'
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}
