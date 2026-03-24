'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, X, Send, Save, Plus, Trash2, Package,
  ShoppingCart, HelpCircle, ArrowDownToLine, CheckCircle2,
  AlertCircle, Building2, Ship,
} from 'lucide-react';
import {
  CreateRequirementSchema,
  type CreateRequirementInput,
} from '@/lib/validations/requirement';
import { createRequirement, updateRequirement, transitionRequirement } from '@/actions/requirements';
import { searchInventoryPins, type InventorySearchResult } from '@/actions/inventory-search';
import { searchItemsForPurchase, type PurchaseItemResult } from '@/actions/purchase-item-search';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormRequestType = 'to_order' | 'to_enquire_price' | 'to_release_from_inventory';
type Profile = { id: string; full_name: string | null; email: string; role: string };
type Vendor  = { id: string; name: string; email?: string | null; code?: string | null };

interface RequirementFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  vessels: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; code: string }>;
  vendors?: Vendor[];
  profiles?: Profile[];
  onSuccess?: (data: any) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'INR', label: 'INR' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'SGD', label: 'SGD' },
] as const;

const inputClass =
  'block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700';
const errorClass = 'mt-1 text-xs text-red-600';

const ACTION_OPTIONS = [
  {
    value: 'to_release_from_inventory' as const,
    label: 'Release from Stock',
    desc: 'Item already in inventory',
    icon: Package,
    color: 'green',
    active: 'border-green-500 bg-green-50 text-green-700',
    iconColor: 'text-green-500',
    ring: 'ring-green-500',
  },
  {
    value: 'to_order' as const,
    label: 'Purchase',
    desc: 'Order from a supplier',
    icon: ShoppingCart,
    color: 'blue',
    active: 'border-blue-500 bg-blue-50 text-blue-700',
    iconColor: 'text-blue-500',
    ring: 'ring-blue-500',
  },
  {
    value: 'to_enquire_price' as const,
    label: 'Enquire Price',
    desc: 'Get quotes before ordering',
    icon: HelpCircle,
    color: 'amber',
    active: 'border-amber-500 bg-amber-50 text-amber-700',
    iconColor: 'text-amber-500',
    ring: 'ring-amber-500',
  },
] as const;

// ─── Per-item inventory search state ─────────────────────────────────────────

interface ItemState {
  // Release-from-stock search
  searchQuery: string;
  searchResults: InventorySearchResult[];
  isSearching: boolean;
  dropdownOpen: boolean;
  linkedPin: InventorySearchResult | null;
  // Purchase catalog search
  purchaseQuery: string;
  purchaseResults: PurchaseItemResult[];
  purchaseSearching: boolean;
  purchaseDropdownOpen: boolean;
  purchaseLinkedPin: PurchaseItemResult | null;
}

const defaultItemState = (): ItemState => ({
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  dropdownOpen: false,
  linkedPin: null,
  purchaseQuery: '',
  purchaseResults: [],
  purchaseSearching: false,
  purchaseDropdownOpen: false,
  purchaseLinkedPin: null,
});

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  index: number;
  field: any;
  register: any;
  setValue: any;
  errors: any;
  canRemove: boolean;
  onRemove: () => void;
  state: ItemState;
  onStateChange: (s: Partial<ItemState>) => void;
  formRequestType: FormRequestType;
}

function ItemRow({
  index, field, register, setValue, errors, canRemove, onRemove,
  state, onStateChange, formRequestType,
}: ItemRowProps) {
  const searchRef = useRef<HTMLDivElement>(null);
  const purchaseSearchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const { linkedPin, searchQuery, searchResults, isSearching, dropdownOpen,
          purchaseLinkedPin, purchaseQuery, purchaseResults, purchaseSearching, purchaseDropdownOpen } = state;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        onStateChange({ dropdownOpen: false });
      if (purchaseSearchRef.current && !purchaseSearchRef.current.contains(e.target as Node))
        onStateChange({ purchaseDropdownOpen: false });
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSearch = useCallback((q: string) => {
    onStateChange({ searchQuery: q, dropdownOpen: true });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { onStateChange({ searchResults: [], isSearching: false }); return; }
    onStateChange({ isSearching: true });
    searchTimer.current = setTimeout(async () => {
      const results = await searchInventoryPins(q);
      onStateChange({ searchResults: results, isSearching: false, dropdownOpen: true });
    }, 300);
  }, []);

  const handlePurchaseSearch = useCallback((q: string) => {
    onStateChange({ purchaseQuery: q, purchaseDropdownOpen: true });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { onStateChange({ purchaseResults: [], purchaseSearching: false }); return; }
    onStateChange({ purchaseSearching: true });
    searchTimer.current = setTimeout(async () => {
      const results = await searchItemsForPurchase(q);
      onStateChange({ purchaseResults: results, purchaseSearching: false, purchaseDropdownOpen: true });
    }, 300);
  }, []);

  const handleLinkPurchasePin = (pin: PurchaseItemResult) => {
    onStateChange({ purchaseLinkedPin: pin, purchaseQuery: pin.description, purchaseDropdownOpen: false });
    setValue(`items.${index}.description`, pin.description);
    setValue(`items.${index}.part_number`, pin.part_number ?? '');
    setValue(`items.${index}.unit`, pin.unit ?? 'pcs');
    setValue(`items.${index}.inventory_pin_id`, pin.id);
    setValue(`items.${index}.item_request_type`, 'to_order');
    if (pin.last_unit_price) {
      setValue(`items.${index}.estimated_unit_price`, pin.last_unit_price);
    }
    if (pin.last_currency) {
      setValue(`items.${index}.currency`, pin.last_currency);
    }
  };

  const handleUnlinkPurchasePin = () => {
    onStateChange({ purchaseLinkedPin: null });
    setValue(`items.${index}.inventory_pin_id`, null);
    setValue(`items.${index}.item_request_type`, 'to_order');
  };

  const handleLinkPin = (pin: InventorySearchResult) => {
    onStateChange({ linkedPin: pin, searchQuery: pin.description, dropdownOpen: false });
    setValue(`items.${index}.description`, pin.description);
    setValue(`items.${index}.part_number`, pin.part_number ?? '');
    setValue(`items.${index}.unit`, pin.unit ?? 'pcs');
    setValue(`items.${index}.inventory_pin_id`, pin.id);
    setValue(`items.${index}.item_request_type`, 'to_release_from_inventory');
  };

  const handleUnlink = () => {
    onStateChange({ linkedPin: null, searchQuery: '', searchResults: [] });
    setValue(`items.${index}.inventory_pin_id`, null);
    setValue(`items.${index}.item_request_type`, null);
    setValue(`items.${index}.description`, '');
    setValue(`items.${index}.part_number`, '');
  };

  return (
    <div className={`rounded-xl border-2 bg-white p-4 space-y-3 ${
      formRequestType === 'to_release_from_inventory'
        ? linkedPin ? 'border-green-200' : 'border-dashed border-gray-200'
        : 'border-gray-100'
    }`}>
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Item {index + 1}
        </span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── RELEASE FROM STOCK ─────────────────────────────────────────────── */}
      {formRequestType === 'to_release_from_inventory' && (
        <>
          {linkedPin ? (
            // Linked PIN card
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-green-800 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                      {linkedPin.pin_number}
                    </span>
                    {linkedPin.part_number && (
                      <span className="text-xs text-green-600">#{linkedPin.part_number}</span>
                    )}
                    {linkedPin.condition && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                        Grade {linkedPin.condition}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-green-900">{linkedPin.description}</div>
                  <div className="flex flex-wrap gap-3 text-xs text-green-700">
                    <span>
                      In stock: <strong>{linkedPin.current_stock} {linkedPin.unit ?? 'pcs'}</strong>
                    </span>
                    {linkedPin.location_code && <span>📍 {linkedPin.location_code}</span>}
                    {linkedPin.vendor_name && (
                      <span className="text-green-600">Supplier: {linkedPin.vendor_name}</span>
                    )}
                    {linkedPin.is_reusable && (
                      <span className="flex items-center gap-0.5 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Reusable
                      </span>
                    )}
                  </div>
                </div>
                <button type="button" onClick={handleUnlink}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Search different item"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Qty for linked item */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-green-200">
                <div>
                  <label className={labelClass}>Qty Needed <span className="text-red-500">*</span></label>
                  <input
                    type="number" min={0.01} step="any"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    className={`mt-1 ${inputClass}`}
                  />
                  <p className="mt-0.5 text-xs text-green-700">
                    Available: {linkedPin.current_stock} {linkedPin.unit ?? 'pcs'}
                  </p>
                  {errors.items?.[index]?.quantity && (
                    <p className={errorClass}>{errors.items[index]?.quantity?.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <input type="text" {...register(`items.${index}.unit`)} className={`mt-1 ${inputClass}`} />
                </div>
              </div>
            </div>
          ) : (
            // Inventory search input
            <div ref={searchRef} className="relative">
              <label className={labelClass}>
                Search Inventory <span className="text-red-500">*</span>
              </label>
              <div className={`mt-1 flex items-center rounded-lg border ${
                dropdownOpen ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'
              } bg-white shadow-sm`}>
                <Search className="ml-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && onStateChange({ dropdownOpen: true })}
                  placeholder="Type item name, PIN, or part number…"
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
                />
                {isSearching && (
                  <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent flex-shrink-0" />
                )}
                {searchQuery && !isSearching && (
                  <button type="button"
                    onClick={() => onStateChange({ searchQuery: '', searchResults: [], dropdownOpen: false })}
                    className="mr-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {dropdownOpen && searchQuery.length >= 2 && (
                <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                        Found in inventory — click to link
                      </div>
                      {searchResults.map((pin) => (
                        <button
                          key={pin.id} type="button" onMouseDown={() => handleLinkPin(pin)}
                          className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                                  {pin.pin_number}
                                </span>
                                {pin.part_number && (
                                  <span className="text-xs text-gray-500">{pin.part_number}</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-900 mt-0.5 truncate">{pin.description}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Stock: <strong>{pin.current_stock}</strong> {pin.unit ?? 'pcs'}
                                {pin.location_code && ` · ${pin.location_code}`}
                                {pin.vendor_name && ` · ${pin.vendor_name}`}
                              </div>
                            </div>
                            <ArrowDownToLine className="h-4 w-4 text-green-500 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-5 text-center">
                      <Package className="h-5 w-5 text-gray-300 mx-auto mb-1.5" />
                      <p className="text-sm font-medium text-gray-500">Not found in inventory</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Switch to <strong>Purchase</strong> or <strong>Enquire Price</strong> to request it
                      </p>
                    </div>
                  )}
                </div>
              )}
              <input type="hidden" {...register(`items.${index}.description`)} />
              <input type="hidden" {...register(`items.${index}.inventory_pin_id`)} />
              <input type="hidden" {...register(`items.${index}.item_request_type`)} />
              {errors.items?.[index]?.description && (
                <p className={errorClass}>{errors.items[index]?.description?.message}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── PURCHASE ────────────────────────────────────────────────────────── */}
      {formRequestType === 'to_order' && (
        <div className="space-y-3">

          {/* Inventory catalog search — find existing items to auto-fill */}
          <div ref={purchaseSearchRef} className="relative">
            <label className={labelClass}>
              Search Catalog
              <span className="ml-1.5 text-xs font-normal text-gray-400">(optional — type to auto-fill from inventory)</span>
            </label>
            <div className={`mt-1 flex items-center rounded-lg border ${
              purchaseDropdownOpen ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'
            } bg-white shadow-sm`}>
              <Search className="ml-3 h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={purchaseQuery}
                onChange={(e) => handlePurchaseSearch(e.target.value)}
                onFocus={() => purchaseQuery.length >= 2 && onStateChange({ purchaseDropdownOpen: true })}
                placeholder="Type item name, PIN, or part number…"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
              />
              {purchaseSearching && (
                <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent flex-shrink-0" />
              )}
              {purchaseQuery && !purchaseSearching && (
                <button type="button"
                  onClick={() => onStateChange({ purchaseQuery: '', purchaseResults: [], purchaseDropdownOpen: false })}
                  className="mr-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Linked from catalog badge */}
            {purchaseLinkedPin && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                <span className="font-mono font-bold">{purchaseLinkedPin.pin_number}</span>
                <span>linked</span>
                {purchaseLinkedPin.last_unit_price && (
                  <span className="text-blue-500">
                    · Last price: {purchaseLinkedPin.last_currency ?? ''} {purchaseLinkedPin.last_unit_price.toLocaleString()}
                  </span>
                )}
                <button type="button" onClick={handleUnlinkPurchasePin} className="ml-0.5 text-blue-400 hover:text-blue-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {purchaseDropdownOpen && purchaseQuery.length >= 2 && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-64 overflow-y-auto">
                {purchaseResults.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                      Select to auto-fill — all fields stay editable
                    </div>
                    {purchaseResults.map((pin) => (
                      <button
                        key={pin.id} type="button" onMouseDown={() => handleLinkPurchasePin(pin)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {pin.pin_number}
                              </span>
                              {pin.part_number && (
                                <span className="text-xs text-gray-500">{pin.part_number}</span>
                              )}
                              {pin.current_stock > 0 && (
                                <span className="text-xs text-green-600 font-medium">
                                  {pin.current_stock} in stock
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-900 mt-0.5 truncate">{pin.description}</div>
                            <div className="flex gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                              {pin.vendor_name && <span>Supplier: {pin.vendor_name}</span>}
                              {pin.last_unit_price && (
                                <span className="text-blue-600 font-medium">
                                  Last price: {pin.last_currency ?? ''} {pin.last_unit_price.toLocaleString()}
                                </span>
                              )}
                              {pin.unit && <span>{pin.unit}</span>}
                            </div>
                          </div>
                          <ShoppingCart className="h-4 w-4 text-blue-400 flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-gray-500">
                    <ShoppingCart className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                    Not in catalog — fill in the details below
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register(`items.${index}.description`)}
              placeholder="What item or material do you need?"
              className={`mt-1 ${inputClass}`}
            />
            {errors.items?.[index]?.description && (
              <p className={errorClass}>{errors.items[index]?.description?.message}</p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Part / Model No.</label>
              <input
                type="text" {...register(`items.${index}.part_number`)}
                placeholder="Optional" className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Qty <span className="text-red-500">*</span></label>
              <input
                type="number" min={0.01} step="any"
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                className={`mt-1 ${inputClass}`}
              />
              {errors.items?.[index]?.quantity && (
                <p className={errorClass}>{errors.items[index]?.quantity?.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Unit <span className="text-red-500">*</span></label>
              <input
                type="text" {...register(`items.${index}.unit`)} placeholder="pcs"
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Est. Unit Price</label>
              <input
                type="number" min={0} step="0.01"
                {...register(`items.${index}.estimated_unit_price`, { valueAsNumber: true })}
                placeholder="0.00" className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select {...register(`items.${index}.currency`)} className={`mt-1 ${inputClass}`}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <input
              type="text" {...register(`items.${index}.notes`)}
              placeholder="Specs, brand, or any other requirement…"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <input type="hidden" {...register(`items.${index}.inventory_pin_id`)} />
          <input type="hidden" {...register(`items.${index}.item_request_type`)} value="to_order" />
        </div>
      )}

      {/* ── ENQUIRE PRICE ───────────────────────────────────────────────────── */}
      {formRequestType === 'to_enquire_price' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register(`items.${index}.description`)}
              placeholder="Describe the item — vendor will quote a price"
              className={`mt-1 ${inputClass}`}
            />
            {errors.items?.[index]?.description && (
              <p className={errorClass}>{errors.items[index]?.description?.message}</p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Part / Model No.</label>
              <input
                type="text" {...register(`items.${index}.part_number`)}
                placeholder="Optional" className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Qty <span className="text-red-500">*</span></label>
              <input
                type="number" min={0.01} step="any"
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                className={`mt-1 ${inputClass}`}
              />
              {errors.items?.[index]?.quantity && (
                <p className={errorClass}>{errors.items[index]?.quantity?.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Unit <span className="text-red-500">*</span></label>
              <input
                type="text" {...register(`items.${index}.unit`)} placeholder="pcs"
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <input
              type="text" {...register(`items.${index}.notes`)}
              placeholder="Any specs or preferences for the vendor to know…"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <input type="hidden" {...register(`items.${index}.inventory_pin_id`)} />
          <input type="hidden" {...register(`items.${index}.item_request_type`)} value="to_enquire_price" />
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function RequirementForm({
  mode, initialData, vessels, departments, vendors = [], profiles = [], onSuccess,
}: RequirementFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateRequirementInput | null>(null);

  // Form-level request type — drives entire form
  const [formRequestType, setFormRequestType] = useState<FormRequestType | null>(
    initialData?.request_type ?? null,
  );

  // Per-item search states
  const [itemStates, setItemStates] = useState<ItemState[]>([defaultItemState()]);

  // Vendor combobox
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorOpen, setVendorOpen]     = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(
    initialData?.preferred_vendor_id
      ? (vendors.find((v) => v.id === initialData.preferred_vendor_id) ?? null)
      : null,
  );
  const [vendorFreeText, setVendorFreeText] = useState(
    initialData?.preferred_vendor_free_text ?? '',
  );
  const vendorRef = useRef<HTMLDivElement>(null);

  // On-behalf-of combobox
  const [oboSearch, setOboSearch]   = useState('');
  const [oboOpen, setOboOpen]       = useState(false);
  const [selectedObo, setSelectedObo] = useState<Profile | null>(
    initialData?.requested_on_behalf_of_profile_id
      ? (profiles.find((p) => p.id === initialData.requested_on_behalf_of_profile_id) ?? null)
      : null,
  );
  const [oboFreeText, setOboFreeText] = useState(initialData?.requested_on_behalf_of ?? '');
  const oboRef = useRef<HTMLDivElement>(null);

  // Click-outside for comboboxes
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (vendorRef.current && !vendorRef.current.contains(e.target as Node)) setVendorOpen(false);
      if (oboRef.current && !oboRef.current.contains(e.target as Node)) setOboOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) || 
      (v.email ?? '').toLowerCase().includes(q) ||
      (v.code ?? '').toLowerCase().includes(q)
    );
  });

  const filteredProfiles = profiles.filter((p) => {
    const q = oboSearch.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  // ─── Build default items ───────────────────────────────────────────────────

  const buildDefaultItems = () => {
    if (initialData?.requirement_items?.length) {
      return initialData.requirement_items.map((item: any, idx: number) => ({
        id: item.id,
        line_number: item.line_number ?? idx + 1,
        description: item.description ?? '',
        part_number: item.part_number ?? '',
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'pcs',
        estimated_unit_price: item.estimated_unit_price ?? undefined,
        currency: item.currency ?? 'USD',
        notes: item.notes ?? '',
        inventory_pin_id: item.inventory_pin_id ?? null,
        item_request_type: item.item_request_type ?? null,
      }));
    }
    return [{
      line_number: 1, description: '', part_number: '', quantity: 1,
      unit: 'pcs', currency: 'USD', inventory_pin_id: null, item_request_type: null,
    }];
  };

  // ─── RHF Setup ────────────────────────────────────────────────────────────

  const {
    register, control, handleSubmit, setValue, formState: { errors },
  } = useForm<CreateRequirementInput>({
    resolver: zodResolver(CreateRequirementSchema) as any,
    defaultValues: {
      vessel_id: initialData?.vessel_id ?? (vessels[0]?.id ?? null),
      department_id: initialData?.department_id ?? (departments[0]?.id ?? null),
      urgency: initialData?.urgency ?? 'routine',
      required_date: initialData?.required_date?.substring(0, 10) ?? null,
      reason: initialData?.reason ?? '',
      preferred_vendor_id: null,
      preferred_vendor_free_text: '',
      requested_on_behalf_of_profile_id: null,
      requested_on_behalf_of: '',
      request_type: initialData?.request_type ?? null,
      items: buildDefaultItems(),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Sync item states count with field array
  useEffect(() => {
    setItemStates((prev) => {
      if (prev.length === fields.length) return prev;
      if (fields.length > prev.length)
        return [...prev, ...Array(fields.length - prev.length).fill(null).map(defaultItemState)];
      return prev.slice(0, fields.length);
    });
  }, [fields.length]);

  // Edit mode: pre-populate item states for linked pins
  useEffect(() => {
    if (mode === 'edit' && initialData?.requirement_items) {
      setItemStates(
        initialData.requirement_items.map((item: any) => {
          if (item.inventory_pin_id) {
            return {
              ...defaultItemState(),
              linkedPin: {
                id: item.inventory_pin_id,
                pin_number: item.inventory_pin?.pin_number ?? '',
                description: item.description ?? '',
                part_number: item.part_number ?? null,
                category: null, unit: item.unit ?? null,
                current_stock: 0, location_code: null, condition: null,
                is_reusable: null, notes: null,
                origin_type: null, origin_reference: null, vendor_name: null,
              },
              searchQuery: item.description ?? '',
            };
          }
          return { ...defaultItemState() };
        }),
      );
    }
  }, []);

  const updateItemState = (idx: number, partial: Partial<ItemState>) => {
    setItemStates((prev) => {
      const next = [...prev];
      next[idx] = { ...(next[idx] ?? defaultItemState()), ...partial };
      return next;
    });
  };

  // ─── Request type change ───────────────────────────────────────────────────

  const handleFormTypeChange = (type: FormRequestType) => {
    if (type !== 'to_release_from_inventory') {
      setItemStates((prev) => prev.map(() => defaultItemState()));
      fields.forEach((_, idx) => {
        setValue(`items.${idx}.inventory_pin_id`, null);
        setValue(`items.${idx}.item_request_type`, type as any);
      });
    } else {
      fields.forEach((_, idx) => {
        setValue(`items.${idx}.item_request_type`, type as any);
      });
    }
    setFormRequestType(type);
    setValue('request_type', type as any);
  };

  // ─── Vendor / OBO handlers ─────────────────────────────────────────────────

  const handleVendorSelect = (v: Vendor | null) => {
    setSelectedVendor(v);
    setValue('preferred_vendor_id', v?.id ?? null);
    setVendorOpen(false);
    setVendorSearch('');
  };

  const handleOboSelect = (p: Profile | null) => {
    setSelectedObo(p);
    setValue('requested_on_behalf_of_profile_id', p?.id ?? null);
    setValue('requested_on_behalf_of', p ? (p.full_name ?? p.email) : oboFreeText);
    setOboOpen(false);
    setOboSearch('');
  };

  // ─── Validation helpers ────────────────────────────────────────────────────

  const getReleaseValidationError = (): string | null => {
    if (formRequestType !== 'to_release_from_inventory') return null;
    const unlinked = itemStates.filter((s) => !s.linkedPin);
    if (unlinked.length > 0) {
      return `${unlinked.length} item${unlinked.length > 1 ? 's' : ''} must be linked to an inventory PIN before submitting.`;
    }
    return null;
  };

  // ─── Prepare + submit ─────────────────────────────────────────────────────

  const prepareValues = (values: CreateRequirementInput): CreateRequirementInput => ({
    ...values,
    preferred_vendor_id: selectedVendor?.id ?? null,
    preferred_vendor_free_text: vendorFreeText || null,
    requested_on_behalf_of: selectedObo
      ? (selectedObo.full_name ?? selectedObo.email)
      : oboFreeText || null,
    requested_on_behalf_of_profile_id: selectedObo?.id ?? null,
    request_type: formRequestType as any,
    items: values.items.map((item, idx) => ({
      ...item,
      inventory_pin_id: itemStates[idx]?.linkedPin?.id ?? null,
      item_request_type: (
        itemStates[idx]?.linkedPin ? 'to_release_from_inventory' : formRequestType
      ) as any,
    })),
  });

  const onSaveDraft = handleSubmit(async (values) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const prepared = prepareValues(values);
      const result = mode === 'create'
        ? await createRequirement(prepared)
        : await updateRequirement(initialData?.id, prepared);
      if (result?.error) {
        setServerError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        return;
      }
      if (onSuccess) onSuccess(result?.data ?? result);
      else router.push('/requirements');
    } catch (e: any) {
      setServerError(e.message ?? 'Unexpected error.');
    } finally {
      setIsSubmitting(false);
    }
  });

  const onClickSubmit = handleSubmit((values) => {
    const releaseErr = getReleaseValidationError();
    if (releaseErr) { setServerError(releaseErr); return; }
    setServerError(null);
    setPendingValues(prepareValues(values));
    setShowConfirm(true);
  });

  const handleConfirmedSubmit = async () => {
    if (!pendingValues) return;
    setShowConfirm(false);
    setServerError(null);
    setIsSubmitting(true);
    try {
      let reqId: string;
      if (mode === 'create') {
        const result = await createRequirement(pendingValues);
        if (result?.error) { setServerError(typeof result.error === 'string' ? result.error : 'Failed'); return; }
        reqId = (result as any)?.data?.id;
      } else {
        const result = await updateRequirement(initialData?.id, pendingValues);
        if (result?.error) { setServerError(typeof result.error === 'string' ? result.error : 'Failed'); return; }
        reqId = initialData?.id;
      }
      // Always transition to 'submitted' regardless of request_type
      // The PM then decides based on the request_type field
      const trans = await transitionRequirement(reqId, 'submitted');
      if (trans?.error) {
        setServerError(typeof trans.error === 'string' ? trans.error : `Submitted but could not transition to submitted.`);
      } else {
        if (onSuccess) onSuccess(null);
        else router.push(`/requirements/${reqId}`);
      }
    } catch (e: any) {
      setServerError(e.message ?? 'Unexpected error.');
    } finally {
      setIsSubmitting(false);
      setPendingValues(null);
    }
  };

  const addItem = () => {
    append({
      line_number: fields.length + 1,
      description: '', part_number: '', quantity: 1, unit: 'pcs', currency: 'USD',
      inventory_pin_id: null, item_request_type: formRequestType as any,
    } as any);
  };

  // ─── Derived display values ────────────────────────────────────────────────

  const vesselName = vessels[0]?.name ?? '—';
  const deptName   = departments[0]?.name ?? '—';
  const selectedActionOpt = ACTION_OPTIONS.find((o) => o.value === formRequestType);

  // Summary for confirm modal
  const linkedCount   = itemStates.filter((s) => s.linkedPin).length;
  const unlinkedCount = fields.length - linkedCount;

  return (
    <>
      <form className="space-y-6" noValidate>
        {/* Hidden fields */}
        <input type="hidden" {...register('vessel_id')}     value={vessels[0]?.id ?? ''} />
        <input type="hidden" {...register('department_id')} value={departments[0]?.id ?? ''} />
        <input type="hidden" {...register('title')}         value="" />
        <input type="hidden" {...register('request_type')}  value={formRequestType ?? ''} />

        {/* ── Context banner ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <Ship className="h-3.5 w-3.5 text-gray-400" />
            {vesselName}
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            {deptName}
          </span>
          <span className="ml-auto text-xs text-gray-400">
            Ref: auto-assigned on submission
          </span>
        </div>

        {/* ── Step 1: Request type ────────────────────────────────────────── */}
        <section>
          <p className="text-sm font-semibold text-gray-800 mb-1">
            What do you need? <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Choose how procurement should handle this request.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {ACTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFormTypeChange(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-5 text-center transition-all ${
                  formRequestType === opt.value
                    ? opt.active
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <opt.icon className={`h-7 w-7 ${
                  formRequestType === opt.value ? '' : opt.iconColor
                }`} />
                <span className="text-sm font-semibold leading-tight">{opt.label}</span>
                <span className="text-[11px] font-normal opacity-70 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Everything below only shows once type is selected ───────────── */}
        {formRequestType && (
          <>
            {/* Error banner */}
            {serverError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {serverError}
              </div>
            )}

            {/* ── Step 2: Items ───────────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Items <span className="text-red-500">*</span>
                  </h2>
                  {formRequestType === 'to_release_from_inventory' && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Search existing inventory — only in-stock items can be released.
                    </p>
                  )}
                </div>
                <button
                  type="button" onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
              </div>

              {errors.items && !Array.isArray(errors.items) && (
                <p className={errorClass}>{(errors.items as any).message}</p>
              )}

              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <ItemRow
                    key={field.id}
                    index={idx}
                    field={field}
                    register={register}
                    setValue={setValue}
                    errors={errors}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(idx)}
                    state={itemStates[idx] ?? defaultItemState()}
                    onStateChange={(s) => updateItemState(idx, s)}
                    formRequestType={formRequestType}
                  />
                ))}
              </div>
            </section>

            {/* ── Step 3: Context ─────────────────────────────────────────── */}
            <section className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-700">Request Context</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="urgency" className={labelClass}>Urgency</label>
                  <select id="urgency" {...register('urgency')} className={`mt-1 ${inputClass}`}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="required_date" className={labelClass}>Required By</label>
                  <input
                    id="required_date" type="date" {...register('required_date')}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>

              {/* On behalf of */}
              <div>
                <label className={labelClass}>
                  Requested By
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    if submitting on someone else's behalf
                  </span>
                </label>
                <div ref={oboRef} className="relative mt-1">
                  <div className={`flex items-center rounded-lg border ${
                    oboOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                  } bg-white shadow-sm`}>
                    <Search className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <input
                      type="text"
                      value={oboOpen ? oboSearch : (selectedObo ? (selectedObo.full_name ?? selectedObo.email) : oboFreeText)}
                      onChange={(e) => {
                        if (selectedObo) { setSelectedObo(null); setValue('requested_on_behalf_of_profile_id', null); }
                        if (!oboOpen) setOboFreeText(e.target.value);
                        else setOboSearch(e.target.value);
                        setOboOpen(true);
                      }}
                      onFocus={() => { setOboOpen(true); setOboSearch(''); }}
                      placeholder="Search by name or email, or type name freely…"
                      className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
                    />
                    {(selectedObo || oboFreeText) && (
                      <button type="button" onClick={() => {
                        setSelectedObo(null); setOboFreeText('');
                        setValue('requested_on_behalf_of_profile_id', null);
                        setValue('requested_on_behalf_of', null);
                      }} className="mr-2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {oboOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                      {filteredProfiles.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 border-b">
                            Registered users
                          </div>
                          {filteredProfiles.map((p) => (
                            <div
                              key={p.id}
                              onMouseDown={() => handleOboSelect(p)}
                              className={`cursor-pointer px-4 py-2.5 hover:bg-blue-50 ${
                                selectedObo?.id === p.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-900">
                                {p.full_name ?? p.email}
                              </div>
                              <div className="text-xs text-gray-500">
                                {p.email} · {p.role.replace(/_/g, ' ')}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      {oboSearch && (
                        <div
                          onMouseDown={() => {
                            setOboFreeText(oboSearch);
                            setValue('requested_on_behalf_of', oboSearch);
                            setValue('requested_on_behalf_of_profile_id', null);
                            setSelectedObo(null);
                            setOboOpen(false);
                          }}
                          className="cursor-pointer px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100"
                        >
                          + Use &quot;{oboSearch}&quot; as name
                        </div>
                      )}
                    </div>
                  )}
                  <input type="hidden" {...register('requested_on_behalf_of_profile_id')} value={selectedObo?.id ?? ''} />
                  <input type="hidden" {...register('requested_on_behalf_of')} value={
                    selectedObo ? (selectedObo.full_name ?? selectedObo.email) : oboFreeText
                  } />
                </div>
                {selectedObo && (
                  <p className="mt-1 text-xs text-green-700">
                    ✓ {selectedObo.full_name ?? selectedObo.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reason" className={labelClass}>Reason / Purpose</label>
                <textarea
                  id="reason" rows={2} {...register('reason')}
                  placeholder="Why is this needed? What will it be used for?"
                  className={`mt-1 ${inputClass}`}
                />
              </div>
            </section>

            {/* ── Step 4: Vendor — only for Purchase / Enquire ────────────── */}
            {(formRequestType === 'to_order' || formRequestType === 'to_enquire_price') && (
              <section className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">Vendor Preference</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Optional. Procurement makes the final vendor decision.
                  </p>
                </div>

                <div ref={vendorRef} className="relative">
                  <label className={labelClass}>Preferred Vendor</label>
                  <div className={`mt-1 flex items-center rounded-lg border ${
                    vendorOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                  } bg-white shadow-sm`}>
                    <Search className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <input
                      type="text"
                      value={vendorOpen ? vendorSearch : (selectedVendor ? selectedVendor.name : '')}
                      onChange={(e) => { setVendorSearch(e.target.value); setVendorOpen(true); }}
                      onFocus={() => { setVendorOpen(true); setVendorSearch(''); }}
                      placeholder="Search vendors in system…"
                      className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
                    />
                    {selectedVendor && (
                      <button type="button" onClick={() => handleVendorSelect(null)}
                        className="mr-2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {vendorOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                      <div
                        onMouseDown={() => handleVendorSelect(null)}
                        className="cursor-pointer px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 border-b"
                      >
                        — No preference —
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
                  <input type="hidden" {...register('preferred_vendor_id')} value={selectedVendor?.id ?? ''} />
                </div>

                <div>
                  <label className={labelClass}>
                    Suggest a Vendor Not in System
                    <span className="ml-2 text-xs font-normal text-gray-400">optional</span>
                  </label>
                  <input
                    type="text"
                    value={vendorFreeText}
                    onChange={(e) => {
                      setVendorFreeText(e.target.value);
                      setValue('preferred_vendor_free_text', e.target.value);
                    }}
                    placeholder="e.g. ABC Marine Supplies, sales@abc.com"
                    className={`mt-1 ${inputClass}`}
                  />
                  <input type="hidden" {...register('preferred_vendor_free_text')} value={vendorFreeText} />
                </div>
              </section>
            )}

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => router.push('/requirements')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {mode === 'edit' ? 'Save Changes' : 'Save Draft'}
                </button>

                {(mode === 'create' || ['draft', 'rejected'].includes(initialData?.status)) && (
                  <button
                    type="button"
                    onClick={onClickSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit to Procurement
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </form>

      {/* ── Confirm Modal ─────────────────────────────────────────────────────── */}
      {showConfirm && pendingValues && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  formRequestType === 'to_release_from_inventory' ? 'bg-green-100' :
                  formRequestType === 'to_order' ? 'bg-blue-100' : 'bg-amber-100'
                }`}>
                  {selectedActionOpt && (
                    <selectedActionOpt.icon className={`h-5 w-5 ${selectedActionOpt.iconColor}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Submit to Procurement?</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {formRequestType === 'to_release_from_inventory' &&
                      `Requesting release of ${fields.length} item${fields.length > 1 ? 's' : ''} from stock.`}
                    {formRequestType === 'to_order' &&
                      `Requesting purchase of ${fields.length} item${fields.length > 1 ? 's' : ''}.`}
                    {formRequestType === 'to_enquire_price' &&
                      `Requesting price enquiry for ${fields.length} item${fields.length > 1 ? 's' : ''}.`}
                  </p>
                </div>
              </div>

              {/* Summary table */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Vessel</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{vesselName}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Type</span>
                  <span className={`font-medium ${
                    formRequestType === 'to_release_from_inventory' ? 'text-green-700' :
                    formRequestType === 'to_order' ? 'text-blue-700' : 'text-amber-700'
                  }`}>{selectedActionOpt?.label}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Items</span>
                  <span className="font-medium text-gray-900">{fields.length}</span>
                </div>
                {pendingValues.urgency !== 'routine' && (
                  <div className="flex justify-between text-gray-600">
                    <span>Urgency</span>
                    <span className={`font-medium ${
                      pendingValues.urgency === 'critical' ? 'text-red-700' : 'text-orange-600'
                    }`}>{pendingValues.urgency}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
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
                  {isSubmitting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
