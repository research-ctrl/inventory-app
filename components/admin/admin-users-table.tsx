'use client';

import { useState, useTransition } from 'react';
import { Pencil, Check, X, Phone, Briefcase, Shield, Save, UserPlus } from 'lucide-react';
import { adminUpdateProfile, grantRoleByEmail } from '@/actions/admin';
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
  super_admin:          'bg-red-100 text-red-800 border-red-200',
  admin:                'bg-rose-100 text-rose-800 border-rose-200',
  procurement_manager:  'bg-purple-100 text-purple-800 border-purple-200',
  procurement_officer:  'bg-violet-100 text-violet-800 border-violet-200',
  store_manager:        'bg-blue-100 text-blue-800 border-blue-200',
  store_keeper:         'bg-sky-100 text-sky-800 border-sky-200',
  qc_inspector:         'bg-teal-100 text-teal-800 border-teal-200',
  engineer:             'bg-indigo-100 text-indigo-800 border-indigo-200',
  approver:             'bg-green-100 text-green-800 border-green-200',
  finance:              'bg-emerald-100 text-emerald-800 border-emerald-200',
  shipbuilder:          'bg-amber-100 text-amber-800 border-amber-200',
  viewer:               'bg-gray-100 text-gray-700 border-gray-200',
};

function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? 'viewer';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${ROLE_COLORS[r] ?? ROLE_COLORS.viewer}`}>
      {ROLE_LABELS[r as Role] ?? r}
    </span>
  );
}

function UserInitials({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
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
  const [fullName, setFullName]     = useState(profile.full_name ?? '');
  const [phone, setPhone]           = useState(profile.phone_number ?? '');
  const [designation, setDesignation] = useState(profile.designation ?? '');
  const [role, setRole]             = useState<Role>((profile.role as Role) ?? 'viewer');
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateProfile(profile.id, {
        full_name:    fullName.trim() || undefined,
        phone_number: phone.trim() || undefined,
        designation:  designation.trim() || undefined,
        role,
      });
      if (!result.success) {
        setError(result.error ?? 'Update failed');
        return;
      }
      onDone({
        full_name:    fullName.trim() || null,
        phone_number: phone.trim() || null,
        designation:  designation.trim() || null,
        role,
      });
    });
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <tr className="bg-blue-50/60 border-l-4 border-l-blue-500">
      <td className="px-4 py-3">
        <UserInitials name={fullName || null} email={profile.email} />
      </td>
      <td className="px-4 py-3 space-y-2 min-w-[200px]">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className={inputCls}
        />
        <p className="text-xs text-gray-400">{profile.email}</p>
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 min-w-[200px]">
        <input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Senior Procurement Officer"
          className={inputCls}
        />
      </td>
      <td className="px-4 py-3 min-w-[160px]">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          className={inputCls}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isPending ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}
        </div>
      </td>
    </tr>
  );
}

// ── Grant by Email Panel ──────────────────────────────────────────────────────
function GrantByEmailPanel() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGrant() {
    if (!email.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await grantRoleByEmail(email.trim(), role);
      if (res.success) {
        setResult({ ok: true, msg: (res as any).message ?? `Role granted to ${email}` });
        setEmail('');
      } else {
        setResult({ ok: false, msg: res.error ?? 'Unknown error' });
      }
    });
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> Grant Role by Email
      </h3>
      <p className="text-xs text-blue-700 mb-3">
        Quickly assign a role to any registered user by their email address.
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-blue-800 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-blue-800 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGrant}
          disabled={isPending || !email.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isPending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <UserPlus className="h-3.5 w-3.5" />}
          {isPending ? 'Granting…' : 'Grant Role'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${result.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
          {result.msg}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersTable({
  profiles: initialProfiles,
  currentUserId,
  isBootstrapMode = false,
}: {
  profiles: ProfileRow[];
  currentUserId: string;
  isBootstrapMode?: boolean;
}) {
  const [profiles, setProfiles] = useState<ProfileRow[]>(initialProfiles);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (p.full_name ?? '').toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.designation ?? '').toLowerCase().includes(q);
    const matchRole = !roleFilter || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  function handleDone(id: string, updates: Partial<ProfileRow>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setEditingId(null);
    setSuccessMsg(`Profile updated successfully.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  const stats = [
    { label: 'Total Users',       value: profiles.length,                                                icon: '👥' },
    { label: 'Admins',            value: profiles.filter((p) => ['admin','super_admin'].includes(p.role ?? '')).length, icon: '🛡️' },
    { label: 'Approvers',         value: profiles.filter((p) => p.role === 'approver').length,           icon: '✅' },
    { label: 'Missing Profile',   value: profiles.filter((p) => !p.full_name).length,                   icon: '⚠️' },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3 shadow-sm">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or designation…"
          className="flex-1 min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        {(search || roleFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-900">Users ({filtered.length})</h2>
          <p className="text-xs text-gray-400">
            Click <strong>Edit</strong> on any row to update name, role, designation, or phone
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-12" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name / Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Role</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Designation</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
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
                      className={`hover:bg-gray-50 transition-colors ${p.id === currentUserId ? 'bg-blue-50/20' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <UserInitials name={p.full_name} email={p.email} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {p.full_name ?? <span className="text-gray-400 italic text-xs">No name set</span>}
                            </p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                          {p.id === currentUserId && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 rounded-full px-1.5 py-0.5">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={p.role} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.designation ?? <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.phone_number ?? <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingId(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
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

      {/* Grant by Email */}
      <GrantByEmailPanel />

      {/* Role Legend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500" />
          Role Reference
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ALL_ROLES.map((r) => (
            <RoleBadge key={r} role={r} />
          ))}
        </div>
        <div className="mt-4 grid gap-1 text-xs text-gray-500">
          <p><strong className="text-gray-700">Approver</strong> — Can approve/reject requirements and purchase orders.</p>
          <p><strong className="text-gray-700">Admin / Super Admin</strong> — Full system access including this admin panel.</p>
          <p><strong className="text-gray-700">Engineer / Procurement Officer</strong> — Can create and submit requirements.</p>
          <p><strong className="text-gray-700">Store Manager / Keeper</strong> — Manage receiving, inventory, and issues.</p>
        </div>
      </div>
    </div>
  );
}
