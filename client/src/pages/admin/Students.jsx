import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, Flame, Search, ShieldCheck, UserCog } from 'lucide-react';
import { useFetch, useDebounced } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal, ErrorState, PageHeader, Pagination, Skeleton } from '../../components/common/ui';
import { DataTable, StatusPill } from '../../components/admin/shared';
import { formatDate } from '../../utils/format';

export default function Students() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  useEffect(() => { setPage(1); }, [q, status]);
  const { data, loading, error, reload } = useFetch(() => adminApi.students({ search: q, status, page, limit: 15 }), [q, status, page]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { user, kind } = confirm;
      if (kind === 'status') await adminApi.setStatus(user.id, user.status === 'active' ? 'suspended' : 'active');
      else await adminApi.setRole(user.id, user.role === 'EDITOR' ? 'STUDENT' : 'EDITOR');
      toast.success('Account updated'); setConfirm(null); reload();
    } catch (err) { toast.error(err.message); setConfirm(null); } finally { setBusy(false); }
  };

  const cols = [
    { key: 'name', label: 'Student', render: (s) => (<div className="min-w-0"><Link to={`/profile/${s.id}`} className="font-semibold text-white hover:text-brand-400">{s.name}</Link><div className="truncate text-xs text-slate-500">{s.email}</div></div>) },
    { key: 'college', label: 'College', render: (s) => <span className="text-slate-300">{s.college || '-'}</span> },
    { key: 'lc', label: 'LeetCode', render: (s) => s.leetcodeUsername ? <a className="text-brand-400 hover:underline" href={`https://leetcode.com/u/${encodeURIComponent(s.leetcodeUsername)}/`} target="_blank" rel="noopener noreferrer">{s.leetcodeUsername}</a> : <span className="text-slate-600">-</span> },
    { key: 'createdAt', label: 'Joined', render: (s) => formatDate(s.createdAt) },
    { key: 'totalCompleted', label: 'Solved', className: 'text-right tabular-nums' },
    { key: 'streak', label: 'Streak', className: 'text-right', render: (s) => <span className="inline-flex items-center gap-1 tabular-nums">{s.currentStreak > 0 && <Flame size={13} className="text-orange-400" />}{s.currentStreak}</span> },
    { key: 'totalPoints', label: 'Points', className: 'text-right font-bold tabular-nums text-white' },
    { key: 'status', label: 'Status', render: (s) => (<div className="flex gap-1.5"><StatusPill tone={s.status === 'active' ? 'emerald' : 'rose'}>{s.status}</StatusPill>{s.role === 'EDITOR' && <StatusPill tone="brand">Editor</StatusPill>}</div>) },
  ];
  if (isAdmin) cols.push({ key: 'actions', label: '', className: 'text-right', render: (s) => (
    <div className="flex justify-end gap-1">
      <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => setConfirm({ user: s, kind: 'role' })} aria-label={s.role === 'EDITOR' ? 'Remove editor' : 'Make editor'} title={s.role === 'EDITOR' ? 'Remove editor access' : 'Grant editor access'}>{s.role === 'EDITOR' ? <UserCog size={16} className="text-brand-400" /> : <ShieldCheck size={16} />}</button>
      <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600" onClick={() => setConfirm({ user: s, kind: 'status' })} aria-label={s.status === 'active' ? 'Suspend' : 'Reactivate'} title={s.status === 'active' ? 'Suspend' : 'Reactivate'}>{s.status === 'active' ? <Ban size={16} className="hover:text-rose-300" /> : <CheckCircle2 size={16} className="text-emerald-300" />}</button>
    </div>) });

  return (
    <div className="page">
      <PageHeader title="Students" subtitle="Everyone who has joined CodeSprint." />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input !pl-9" placeholder="Search name, email, college or LeetCode…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" /></div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-72" /> : (<><DataTable columns={cols} rows={data.items} empty="No students match." /><Pagination pagination={data.pagination} onPage={setPage} /></>)}
      <ConfirmModal open={!!confirm} busy={busy} danger={confirm?.kind === 'status' && confirm?.user.status === 'active'} onClose={() => setConfirm(null)} onConfirm={run}
        title={confirm?.kind === 'status' ? (confirm.user.status === 'active' ? 'Suspend account?' : 'Reactivate account?') : (confirm?.user.role === 'EDITOR' ? 'Remove editor access?' : 'Grant editor access?')}
        confirmLabel="Confirm"
        message={confirm?.kind === 'status' ? `${confirm?.user.name} will be ${confirm?.user.status === 'active' ? 'signed out and unable to log in' : 'able to log in again'}.` : confirm?.user.role === 'EDITOR' ? `${confirm?.user.name} will lose access to the admin panel.` : `${confirm?.user.name} will be able to manage questions, challenges and videos. Only grant this to people you trust.`} />
    </div>
  );
}
