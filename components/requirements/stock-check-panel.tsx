'use client';

import { useState } from 'react';

export interface StockCheckResult {
  pinId: string;
  pinNumber: string;
  description: string;
  partNumber: string | null;
  currentStock: number;
  quantityAvailable: number;
  locationCode: string | null;
  matchedItemIndex: number; // which required item this matches
}

interface RequiredItem {
  description: string;
  part_number?: string;
  quantity: number;
  unit: string;
}

interface ItemStockResult {
  item: RequiredItem;
  itemIndex: number;
  matches: StockCheckResult[];
  totalAvailable: number;
  status: 'fully_available' | 'partially_available' | 'not_available' | 'not_checked';
}

interface StockCheckPanelProps {
  items: RequiredItem[];
  stockData?: StockCheckResult[];
}

function computeItemResults(
  items: RequiredItem[],
  stockData: StockCheckResult[] | undefined
): ItemStockResult[] {
  return items.map((item, idx) => {
    if (!stockData) {
      return { item, itemIndex: idx, matches: [], totalAvailable: 0, status: 'not_checked' };
    }
    const matches = stockData.filter((s) => s.matchedItemIndex === idx);
    const totalAvailable = matches.reduce((sum, m) => sum + m.quantityAvailable, 0);
    let status: ItemStockResult['status'];
    if (matches.length === 0) {
      status = 'not_available';
    } else if (totalAvailable >= item.quantity) {
      status = 'fully_available';
    } else if (totalAvailable > 0) {
      status = 'partially_available';
    } else {
      status = 'not_available';
    }
    return { item, itemIndex: idx, matches, totalAvailable, status };
  });
}

function StatusChip({ status }: { status: ItemStockResult['status'] }) {
  const map = {
    fully_available: 'bg-green-100 text-green-800',
    partially_available: 'bg-amber-100 text-amber-800',
    not_available: 'bg-red-100 text-red-800',
    not_checked: 'bg-gray-100 text-gray-600',
  } as const;
  const label = {
    fully_available: 'Fully Available',
    partially_available: 'Partially Available',
    not_available: 'Not Available',
    not_checked: 'Not Checked',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default function StockCheckPanel({ items, stockData }: StockCheckPanelProps) {
  const [localStockData, setLocalStockData] = useState<StockCheckResult[] | undefined>(stockData);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(!!stockData);

  const results = computeItemResults(items, localStockData);

  // Derive overall summary
  const overallSummary = (() => {
    if (!checked) return null;
    const statuses = results.map((r) => r.status);
    if (statuses.every((s) => s === 'fully_available')) {
      return { label: 'Direct Issue Possible', cls: 'bg-green-100 text-green-800 border-green-200' };
    }
    if (statuses.every((s) => s === 'not_available')) {
      return { label: 'Full Procurement Required', cls: 'bg-red-100 text-red-800 border-red-200' };
    }
    return { label: 'Partial Stock + Procurement Needed', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  })();

  const handleCheckStock = async () => {
    setLoading(true);
    try {
      // Build a search payload from items and call the inventory search endpoint
      // In production this would call a server action; here we simulate a fetch
      const resp = await fetch('/api/stock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (resp.ok) {
        const data: StockCheckResult[] = await resp.json();
        setLocalStockData(data);
      } else {
        // Graceful fallback — mark all as not_available
        setLocalStockData([]);
      }
    } catch {
      setLocalStockData([]);
    } finally {
      setLoading(false);
      setChecked(true);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        No line items to check.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Stock Availability</h3>
        {!checked && (
          <button
            type="button"
            onClick={handleCheckStock}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                Checking…
              </>
            ) : (
              'Check Stock Availability'
            )}
          </button>
        )}
        {checked && (
          <button
            type="button"
            onClick={() => {
              setChecked(false);
              setLocalStockData(undefined);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Re-check
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Required Item</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Required Qty</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Matching PINs</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {results.map((result) => (
              <tr key={result.itemIndex}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{result.item.description}</p>
                  {result.item.part_number && (
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      P/N: {result.item.part_number}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {result.item.quantity} {result.item.unit}
                </td>
                <td className="px-4 py-3">
                  {result.status === 'not_checked' ? (
                    <span className="text-gray-400 text-xs italic">Not checked</span>
                  ) : result.matches.length === 0 ? (
                    <span className="text-gray-400 text-xs">No matches found</span>
                  ) : (
                    <ul className="space-y-1">
                      {result.matches.map((m) => (
                        <li key={m.pinId} className="text-xs">
                          <span className="font-mono text-blue-700">{m.pinNumber}</span>
                          {m.locationCode && (
                            <span className="text-gray-500 ml-1">({m.locationCode})</span>
                          )}
                          <span className="ml-1 text-gray-700">
                            — {m.quantityAvailable} avail.
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={result.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overallSummary && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${overallSummary.cls}`}
        >
          <span>Routing Recommendation:</span>
          <span>{overallSummary.label}</span>
        </div>
      )}
    </div>
  );
}
