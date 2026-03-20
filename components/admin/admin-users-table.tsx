'use client';

import { useState, useTransition } from 'react';
import { Pencil, Check, X, Phone, Briefcase, Shield } from 'lucide-react';
import { adminUpdateProfile } from '@/actions/admin';
import { ROLE_LABELS } from '@/lib/auth/roles';
import type { Role } from '@/lib/auth/roles';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  department: string | null;
  phone_number: string | null;
  designation: string | null;
}

const ALL_ROLES: Role[] = [
  'super_admin', 'admin', 'procurement_manager', 'procurement_officer',
  'store_manager', 'store_keeper', 'qc_inspector', 'engineer',
  'approver', 'finance', 'shipbuilder', 'viewer',
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  admin: 'bg-rose-100 text-rose-800',
  procurement_manager: 'bg-purple-100 text-purple-800',
  procurement_officer: 'bg-violet-100 text-violet-800',
  store_manager: 'bg-blue-100 text-blue-800',
  store_keeper: 'bg-sky-100 text-sky-800',
  qc_inspector: 'bg-teal-100 text-teal-800',
  engineer: 'bg-indigo-100 text-indigo-800',
  approver: 'bg-green-100 text-green-800',
  finance: 'bg-emerald-100 text-emerald-800',
  shipbuilder: 'bg-amber-100 text-amber-800',
  viewer: 'bg-gray-100 text-gray-700',
};

function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? 'viewer';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r] ?? ROLE_COLORS.viewer}`}>
      {ROLE_LABELS[r as Role] ?? r}
    </span>
  );
}

function UserInitials({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
      {initials}
    </div>
  );
}

interface EditRowProps {
  profile: ProfileRow;
  onDone: (updated: Partial<ProfileRow>) => void;
  onCancel: () => void;
}

function EditRow({ profile, onDone, onCancel }: EditRowProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone_number ?? '');
  const [designation, setDesignation] = useState(profile.designation ?? '');
  const [role, setRole] = useState<Role>((profile.role as Role) ?? 'viewer');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateProfile(profile.id, {
        full_name: fullName.trim() || undefined,
        phone_number: phone.trim() || undefined,
        designation: designation.trim() || undefined,
        role,
      });
      if (!result.success) {
        setError(result.error ?? 'Update failed');
        return;
      }
      onDone({ full_name: fullName, phone_number: phone, designation, role });
    });
  };

  const inputCls =
    'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <tr className="bg-blue-50/40">
      <td className="px-4 py-3">
        <UserInitials name={fullName || null} email={profile.email} />
      </td>
      <td className="px-4 py-3 space-y-1.5">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className={inputCls}
        />
        <p className="text-xs text-gray-400">{profile.email}</p>
      </td>
      <td className="px-4 py-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className={inputCls}
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Senior Procurement Officer"
          className={inputCls}
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          className={inputCls}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Save
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

export default function AdminUsersTable({
  profiles: initialProfiles,
  currentUserId,
}: {
  profiles: ProfileRow[];
  currentUserId: string;
}) {
  const [profiles, setProfiles] = useState<ProfileRow[]>(initialProfiles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filtered = profiles.filter((p) => {
    const matchSearch =
      !search ||
      (p.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.designation ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  function handleDone(id: string, updates: Partial<ProfileRow>) {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', value: profiles.length, icon: '👤' },
          {
            label: 'Approvers',
            value: profiles.filter((p) => p.role === 'approver').length,
            icon: '✅',
          },
          {
            label: 'Admins',
            value: profiles.filter((p) => ['admin', 'super_admin'].includes(p.role ?? '')).length,
            icon: '🛡️',
          },
          {
            label: 'Without Profile',
            value: profiles.filter((p) => !p.full_name).length,
            icon: '⚠️',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3"
          >
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or designation…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Users ({filtered.length})
          </h2>
          <p className="text-xs text-gray-400">
            Click <strong>Edit</strong> to update a user's profile, role or designation
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-10" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Name / Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Role
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Designation
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) =>
                  editingId === p.id ? (
                    <EditRow
                      key={p.id}
                      profile={p}
                      onDone={(updates) => handleDone(p.id, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        p.id === currentUserId ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <UserInitials name={p.full_name} email={p.email} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {p.full_name ?? (
                            <span className="text-gray-400 italic">No name set</span>
                          )}
                          {p.id === currentUserId && (
                            <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={p.role} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.designation ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.phone_number ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingId(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role legend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Role Permissions Reference</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ALL_ROLES.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <RoleBadge role={r} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          <strong>Approver</strong> — Can approve/reject requirements and purchase orders.
          <strong className="ml-2">Admin / Super Admin</strong> — Full system access including this panel.
          Assign roles carefully — they control what each user can see and do.
        </p>
      </div>
    </div>
  );
}
