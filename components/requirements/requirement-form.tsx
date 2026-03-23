'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, X, Send, Save } from 'lucide-react';
import {
  CreateRequirementSchema,
  type CreateRequirementInput,
} from '@/lib/validations/requirement';
import { createRequirement, updateRequirement, transitionRequirement } from '@/actions/requirements';

interface RequirementFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  vessels: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; code: string }>;
  approvers?: Array<{ id: string; full_name: string | null; email: string; role: string }>;
  vendors?: Array<{ id: string; name: string; email?: string | null }>;
  onSuccess?: (data: any) => void;
}

type Approver = { id: string; full_name: string | null; email: string; role: string };
type Vendor   = { id: string; name: string; email?: string | null };

export default function RequirementForm({
  mode,
  initialData,
  vessels,
  departments,
  approvers = [],
  vendors = [],
  onSuccess,
}: RequirementFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approver search combobox
  const [approverSearch, setApproverSearch] = useState('');
  const [approverOpen, setApproverOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<Approver | null>(
    initialData?.assigned_approver_id
      ? (approvers.find((a) => a.id === initialData.assigned_approver_id) ?? null)
      : null
  );
  const approverRef = useRef<HTMLDivElement>(null);

  // Vendor combobox
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorOpen, setVendorOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(
    initialData?.preferred_vendor_id
      ? (vendors.find((v) => v.id === initialData.preferred_vendor_id) ?? null)
      : null
  );
  const vendorRef = useRef<HTMLDivElement>(null);

  // Confirmation modal for Send for Approval
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateRequirementInput | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (approverRef.current && !approverRef.current.contains(e.target as Node)) {
        setApproverOpen(false);
      }
      if (vendorRef.current && !vendorRef.current.contains(e.target as Node)) {
        setVendorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase();
    return v.name.toLowerCase().includes(q) || (v.email ?? '').toLowerCase().includes(q);
  });

  const handleVendorSelect = (v: Vendor | null) => {
    setSelectedVendor(v);
    setValue('preferred_vendor_id', v?.id ?? null);
    setVendorOpen(false);
    setVendorSearch('');
  };

  const filteredApprovers = approvers.filter((a) => {
    const q = approverSearch.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateRequirementInput>({
    resolver: zodResolver(CreateRequirementSchema) as any,
    defaultValues: initialData
      ? {
          title: initialData.title ?? '',
          description: initialData.description ?? '',
          vessel_id: initialData.vessel_id ?? null,
          department_id: initialData.department_id ?? null,
          assigned_approver_id: initialData.assigned_approver_id ?? null,
          preferred_vendor_id: initialData.preferred_vendor_id ?? null,
          reason: initialData.reason ?? '',
          requested_on_behalf_of: initialData.requested_on_behalf_of ?? '',
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
            })) ?? [{ line_number: 1, description: '', part_number: '', quantity: 1, unit: 'pcs', currency: 'USD' }],
        }
      : {
          title: '',
          description: '',
          vessel_id: null,
          department_id: null,
          assigned_approver_id: null,
          preferred_vendor_id: null,
          reason: '',
          requested_on_behalf_of: '',
          urgency: 'routine',
          required_date: null,
          budget_estimate: null,
          currency: 'USD',
          items: [{ line_number: 1, description: '', part_number: '', quantity: 1, unit: 'pcs', currency: 'USD' }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const handleApproverSelect = (a: Approver | null) => {
    setSelectedApprover(a);
    setValue('assigned_approver_id', a?.id ?? null);
    setApproverOpen(false);
    setApproverSearch('');
  };

  // Save as draft
  const onSaveDraft = handleSubmit(async (values) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      let result: any;
      if (mode === 'create') {
        result = await createRequirement(values);
      } else {
        result = await updateRequirement(initialData?.id, values);
      }
      if (result?.error) {
        setServerError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        return;
      }
      if (onSuccess) onSuccess(result?.data ?? result);
      else router.push('/requirements');
    } catch (e: any) {
      setServerError(e.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  });

  // Show confirmation before sending for approval
  const onClickSendForApproval = handleSubmit((values) => {
    setPendingValues(values);
    setShowConfirm(true);
  });

  // Confirmed: create + immediately transition to pending_approval
  const handleConfirmedSubmit = async () => {
    if (!pendingValues) return;
    setShowConfirm(false);
    setServerError(null);
    setIsSubmitting(true);
    try {
      let reqId: string;
      if (mode === 'create') {
        const result = await createRequirement(pendingValues);
        if (result?.error) {
          setServerError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
          return;
        }
        reqId = (result as any)?.data?.id;
      } else {
        const result = await updateRequirement(initialData?.id, pendingValues);
        if (result?.error) {
          setServerError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
          return;
        }
        reqId = initialData?.id;
      }
      // Transition to pending_approval — email is sent automatically
      const trans = await transitionRequirement(reqId, 'pending_approval');
      if (trans?.error) {
        setServerError(typeof trans.error === 'string' ? trans.error : 'Submitted but could not transition — please do it manually.');
      } else {
        if (onSuccess) onSuccess(null);
        else router.push(`/requirements/${reqId}`);
      }
    } catch (e: any) {
      setServerError(e.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
      setPendingValues(null);
    }
  };

  const inputClass =
    'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <>
      <form className="space-y-8" noValidate>
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
              {errors.description && <p className={errorClass}>{errors.description.message}</p>}
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
              {errors.vessel_id && <p className={errorClass}>{errors.vessel_id.message}</p>}
            </div>

            <div>
              <label htmlFor="department_id" className={labelClass}>
                Department
              </label>
              <select id="department_id" {...register('department_id')} className={inputClass}>
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
              {errors.department_id && <p className={errorClass}>{errors.department_id.message}</p>}
            </div>

            {/* Searchable Approver Combobox */}
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Assign Approver{' '}
                <span className="text-gray-400 font-normal text-xs">(search by name or email)</span>
              </label>
              <div ref={approverRef} className="relative mt-1">
                {/* Selected display / search input */}
                <div
                  className={`flex items-center rounded-lg border ${
                    approverOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                  } bg-white shadow-sm`}
                >
                  <Search className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type="text"
                    value={approverOpen ? approverSearch : (selectedApprover ? `${selectedApprover.full_name || selectedApprover.email} (${selectedApprover.role})` : '')}
                    onChange={(e) => {
                      setApproverSearch(e.target.value);
                      setApproverOpen(true);
                    }}
                    onFocus={() => {
                      setApproverOpen(true);
                      setApproverSearch('');
                    }}
                    placeholder="Search approver by name or email…"
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400"
                  />
                  {selectedApprover && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleApproverSelect(null); }}
                      className="mr-2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                      aria-label="Clear approver"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {approverOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div
                      className="cursor-pointer px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                      onMouseDown={() => handleApproverSelect(null)}
                    >
                      — Leave unassigned (auto-assign by role) —
                    </div>
                    {filteredApprovers.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">No approvers found</p>
                    ) : (
                      filteredApprovers.map((a) => (
                        <div
                          key={a.id}
                          onMouseDown={() => handleApproverSelect(a)}
                          className={`cursor-pointer px-4 py-2.5 hover:bg-blue-50 ${
                            selectedApprover?.id === a.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {a.full_name || a.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {a.email} · {a.role.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Hidden field for form value */}
              <input type="hidden" {...register('assigned_approver_id')} value={selectedApprover?.id ?? ''} />

              {selectedApprover && (
                <p className="mt-1.5 text-xs text-green-700 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  Approval request will be sent to{' '}
                  <strong>{selectedApprover.full_name || selectedApprover.email}</strong>
                </p>
              )}
              {!selectedApprover && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Approver will be auto-selected by role if left blank.
                </p>
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
              {errors.required_date && <p className={errorClass}>{errors.required_date.message}</p>}
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
              {errors.budget_estimate && <p className={errorClass}>{errors.budget_estimate.message}</p>}
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

        {/* Request Context */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Request Context</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Reason */}
            <div className="sm:col-span-2">
              <label htmlFor="reason" className={labelClass}>
                Reason for Request{' '}
                <span className="text-xs font-normal text-gray-400">(why is this item needed?)</span>
              </label>
              <textarea
                id="reason"
                rows={3}
                {...register('reason')}
                placeholder="Describe why this item is needed and what it will be used for…"
                className={inputClass}
              />
              {errors.reason && <p className={errorClass}>{errors.reason.message}</p>}
            </div>

            {/* Requested on behalf of */}
            <div className="sm:col-span-2">
              <label htmlFor="requested_on_behalf_of" className={labelClass}>
                Requested On Behalf Of{' '}
                <span className="text-xs font-normal text-gray-400">(leave blank if for yourself)</span>
              </label>
              <input
                id="requested_on_behalf_of"
                type="text"
                {...register('requested_on_behalf_of')}
                placeholder="Name or team who asked for this item (e.g. Chief Engineer, Bridge Team)"
                className={inputClass}
              />
              {errors.requested_on_behalf_of && (
                <p className={errorClass}>{errors.requested_on_behalf_of.message}</p>
              )}
            </div>

            {/* Preferred Vendor */}
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Preferred Vendor{' '}
                <span className="text-xs font-normal text-gray-400">(optional — leave blank for "any vendor")</span>
              </label>
              <div ref={vendorRef} className="relative mt-1">
                <div
                  className={`flex items-center rounded-lg border ${
                    vendorOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                  } bg-white shadow-sm`}
                >
                  <Search className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type="text"
                    value={vendorOpen ? vendorSearch : (selectedVendor ? selectedVendor.name : '')}
                    onChange={(e) => { setVendorSearch(e.target.value); setVendorOpen(true); }}
                    onFocus={() => { setVendorOpen(true); setVendorSearch(''); }}
                    placeholder="Search vendors by name…"
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400"
                  />
                  {selectedVendor && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleVendorSelect(null); }}
                      className="mr-2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                      aria-label="Clear vendor"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {vendorOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    <div
                      className="cursor-pointer px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                      onMouseDown={() => handleVendorSelect(null)}
                    >
                      — Any vendor (procurement team will decide) —
                    </div>
                    {filteredVendors.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">No vendors found</p>
                    ) : (
                      filteredVendors.map((v) => (
                        <div
                          key={v.id}
                          onMouseDown={() => handleVendorSelect(v)}
                          className={`cursor-pointer px-4 py-2.5 hover:bg-blue-50 ${
                            selectedVendor?.id === v.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">{v.name}</div>
                          {v.email && <div className="text-xs text-gray-500">{v.email}</div>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Hidden field */}
              <input type="hidden" {...register('preferred_vendor_id')} value={selectedVendor?.id ?? ''} />

              {selectedVendor ? (
                <p className="mt-1.5 text-xs text-blue-700 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Preferred vendor: <strong>{selectedVendor.name}</strong>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-gray-400">
                  No preference set — procurement team will source from any suitable vendor.
                </p>
              )}
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
                append({ line_number: fields.length + 1, description: '', part_number: '', quantity: 1, unit: 'pcs', currency: 'USD' })
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
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Description *</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Part No.</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Qty *</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Unit *</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Est. Unit Price</th>
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
                        <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.description?.message}</p>
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
                        <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        {...register(`items.${index}.unit`)}
                        placeholder="pcs"
                        className="w-16 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        {...register(`items.${index}.estimated_unit_price`, { valueAsNumber: true })}
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

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => router.push('/requirements')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Save as Draft */}
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {mode === 'edit' ? 'Save Changes' : 'Save as Draft'}
            </button>

            {/* Send for Approval (create mode only — edit mode uses the draft-then-transition flow on detail page) */}
            {(mode === 'create' || (mode === 'edit' && (initialData?.status === 'draft' || initialData?.status === 'rejected'))) && (
              <button
                type="button"
                onClick={onClickSendForApproval}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send for Approval
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowConfirm(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Send for Approval?</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    This will{' '}
                    {mode === 'create' ? 'create the requirement and ' : ''}
                    submit it for approval.{' '}
                    {selectedApprover ? (
                      <>
                        An email will be sent to{' '}
                        <strong>{selectedApprover.full_name || selectedApprover.email}</strong> immediately.
                      </>
                    ) : (
                      'The system will auto-assign an approver and notify them by email.'
                    )}
                  </p>
                </div>
              </div>

              {selectedApprover && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm">
                  <div className="font-medium text-blue-900">Assigned Approver</div>
                  <div className="text-blue-700 mt-0.5">
                    {selectedApprover.full_name || selectedApprover.email}
                    <span className="text-blue-400"> · {selectedApprover.email}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Yes, Send for Approval
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
