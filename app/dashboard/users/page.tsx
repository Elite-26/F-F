'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Building2,
  Sparkles,
  Users,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { RESUME_TEMPLATES, ResumeTemplateId } from '@/lib/resume/template-ids';
import { ExperienceOption } from '@/lib/resume/experience-option';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  resumeTemplate: ResumeTemplateId;
  experienceOption: ExperienceOption;
  createdAt: string;
}

type StatusFilter = 'all' | 'approved' | 'pending';

function templateLabel(id: ResumeTemplateId): string {
  return id.replace('template_', 'Template ');
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const patchUser = async (userId: string, body: Record<string, unknown>, errorMessage: string) => {
    try {
      setUpdating(userId);
      setError('');
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...body }),
      });
      if (!response.ok) {
        throw new Error(errorMessage);
      }
      await fetchUsers();
    } catch (err) {
      setError(errorMessage);
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && user.approved) ||
      (statusFilter === 'pending' && !user.approved);
    return matchesSearch && matchesStatus;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.approved).length;
  const pendingUsers = users.filter((u) => !u.approved).length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading users…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          Approve accounts, assign roles, and set each user’s resume template and company source.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: totalUsers, icon: Users, tone: 'text-gray-900 bg-gray-100' },
          { label: 'Approved', value: activeUsers, icon: UserCheck, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'Pending', value: pendingUsers, icon: Clock, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Admins', value: adminUsers, icon: UserCog, tone: 'text-indigo-700 bg-indigo-50' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3 shadow-sm"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-semibold text-gray-900 leading-none mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm self-start">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'approved', label: 'Approved' },
              { id: 'pending', label: 'Pending' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const isUpdating = updating === user.id;
          const option = user.experienceOption || 'option_1';
          const initial = user.name.charAt(0).toUpperCase();

          return (
            <article
              key={user.id}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-opacity ${
                isUpdating ? 'opacity-70' : 'opacity-100'
              } ${user.approved ? 'border-gray-200' : 'border-amber-200'}`}
            >
              <div className="p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-white font-semibold ${
                      user.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900 truncate">{user.name}</h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          user.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Shield size={12} />
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      {user.approved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle size={12} />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700">
                          <Clock size={12} />
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!user.approved ? (
                    <button
                      type="button"
                      onClick={() => patchUser(user.id, { approved: true }, 'Failed to approve user')}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => patchUser(user.id, { approved: false }, 'Failed to revoke approval')}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <XCircle size={16} />
                      Revoke
                    </button>
                  )}
                  {user.role === 'user' ? (
                    <button
                      type="button"
                      onClick={() => patchUser(user.id, { role: 'admin' }, 'Failed to update role')}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                    >
                      <Shield size={16} />
                      Make admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => patchUser(user.id, { role: 'user' }, 'Failed to update role')}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <Shield size={16} />
                      Remove admin
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 bg-slate-50/80 px-4 sm:px-5 py-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-gray-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Resume template
                      </span>
                    </div>
                    <select
                      value={user.resumeTemplate || 'template_1'}
                      disabled={isUpdating}
                      onChange={(e) =>
                        patchUser(
                          user.id,
                          { resumeTemplate: e.target.value },
                          'Failed to update resume template'
                        )
                      }
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                    >
                      {RESUME_TEMPLATES.map((templateId) => (
                        <option key={templateId} value={templateId}>
                          {templateLabel(templateId)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 size={14} className="text-gray-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Company source
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          patchUser(
                            user.id,
                            { experienceOption: 'option_1' },
                            'Failed to update experience option'
                          )
                        }
                        className={`text-left rounded-xl border px-3 py-2.5 transition-all disabled:opacity-50 ${
                          option === 'option_1'
                            ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Building2
                            size={14}
                            className={option === 'option_1' ? 'text-indigo-600' : 'text-gray-400'}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              option === 'option_1' ? 'text-indigo-900' : 'text-gray-800'
                            }`}
                          >
                            Option 1
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                          Company & location from Options
                        </p>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          patchUser(
                            user.id,
                            { experienceOption: 'option_2' },
                            'Failed to update experience option'
                          )
                        }
                        className={`text-left rounded-xl border px-3 py-2.5 transition-all disabled:opacity-50 ${
                          option === 'option_2'
                            ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles
                            size={14}
                            className={option === 'option_2' ? 'text-indigo-600' : 'text-gray-400'}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              option === 'option_2' ? 'text-indigo-900' : 'text-gray-800'
                            }`}
                          >
                            Option 2
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                          Company & location from tailored text
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-3">
                  Timeline dates always come from Options. Option 2 only swaps company name and location.
                </p>
              </div>
            </article>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="text-gray-400" size={26} />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No users match</h3>
            <p className="text-sm text-gray-500 mt-1">Try another search or status filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
