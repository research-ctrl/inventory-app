'use client';

import { useState, useMemo } from 'react';
import { DataTable } from '@/components/shared/data-table';
import { requirementColumns } from './requirements-columns';
import type { RequirementRow } from '@/lib/db/queries/requirements';

interface RequirementsTableProps {
  data: RequirementRow[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'All Urgency' },
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

export default function RequirementsTable({ data }: RequirementsTableProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (urgencyFilter && row.urgency !== urgencyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = row.title?.toLowerCase().includes(q) ?? false;
        const matchRef = row.ref_number?.toLowerCase().includes(q) ?? false;
        const matchVessel = row.vessel?.name?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchRef && !matchVessel) return false;
      }
      return true;
    });
  }, [data, statusFilter, urgencyFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by urgency"
        >
          {URGENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, ref, vessel…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search requirements"
        />

        {(statusFilter || urgencyFilter || search) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setUrgencyFilter('');
              setSearch('');
            }}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <DataTable columns={requirementColumns} data={filtered} />
    </div>
  );
}
