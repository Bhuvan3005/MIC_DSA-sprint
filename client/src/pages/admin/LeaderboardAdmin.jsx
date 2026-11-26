import { useState } from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal, ErrorState, Field, Modal, PageHeader, Pagination, Skeleton, Spinner, StatCard } from '../../components/common/ui';
import { DataTable, StatusPill } from '../../components/admin/shared';
import { formatDate } from '../../utils/format';
import { Trophy, Users, Target, ScrollText } from 'lucide-react';

import Button from '../../components/common/Button';
export default function LeaderboardAdmin() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const stats = useFetch(() => adminApi.leaderboardStats(), []);
  const comps = useFetch(() => adminApi.competitions(), []);
  const [page, setPage] = useState(1);
  const subs = useFetch(() => (isAdmin ? adminApi.completions({ page, limit: 10 }) : Promise.resolve(null)), [page, isAdmin]);
  const [reset, setReset] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const doReset = async () => {
    setBusy(true);
    try { await adminApi.resetCompetition(reset); toast.success(`${reset} competition reset. History kept.`); setReset(null); comps.reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doVoid = async () => {
    setBusy(true);
    try { await adminApi.voidCompletion(voiding._id, reason); toast.success('Submission voided and points reversed'); setVoiding(null); setReason(''); subs.reload(); stats.reload(); }
    catch (e) { toast.error(e.details?.[0]?.message || e.message); } finally { setBusy(false); }
  };

  const s = stats.data?.stats;
  const cols = [
    { key: 'user', label: 'Student', render: (c) => <div><div className="font-semibold text-white">{c.user?.name}</div><div className="text-xs text-slate-500">{c.user?.email}</div></div> },
    { key: 'question', label: 'Question', render: (c) => c.question?.title },
    { key: 'date', label: 'Date' },
    { key: 'v', label: 'Verification', render: (c) => <StatusPill tone={c.verificationStatus === 'verified' ? 'emerald' : c.verificationStatus === 'rejected' ? 'rose' : 'slate'}>{c.voided ? 'voided' : c.verificationStatus.replace('_', ' ')}</StatusPill> },
    { key: 'a', label: '', className: 'text-right', render: (c) => !c.voided && <Button variant="danger" className="!py-1 text-xs" onClick={() => setVoiding(c)}><ShieldAlert size={13} />Void</Button> },
  ];

  return (
    <div className="page space-y-6">
      <PageHeader title="Leaderboard management" subtitle="Competition periods, scoring integrity and invalid submissions." />
      {stats.error ? <ErrorState error={stats.error} onRetry={stats.reload} /> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Ranked students" value={s?.students} />
          <StatCard icon={Trophy} tone="amber" label="Points in circulation" value={s?.points} />
          <StatCard icon={Target} tone="emerald" label="Completions" value={s?.completed} />
          <StatCard icon={ScrollText} tone="sky" label="Ledger entries" value={s?.ledgerEntries} />
        </div>)}

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Competition periods</h2>
        <p className="mb-4 text-sm text-slate-400">Resetting closes the current period, freezes its final standings and starts a fresh one. Points history is never deleted, and the global leaderboard is unaffected.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {['weekly', 'monthly'].map((t) => (
            <div key={t} className="rounded-xl border border-ink-500/60 bg-ink-900/50 p-4">
              <div className="flex items-center justify-between"><span className="font-semibold capitalize text-white">{t}</span><StatusPill tone={comps.data?.current[t].managed ? 'brand' : 'slate'}>{comps.data?.current[t].managed ? 'Managed' : 'Calendar'}</StatusPill></div>
              <p className="mt-1 text-xs text-slate-400">Counting since {comps.data ? formatDate(comps.data.current[t].from, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '…'}</p>
              {isAdmin && <Button variant="ghost" className="mt-3" onClick={() => setReset(t)}><RotateCcw size={15} />Reset {t} period</Button>}
            </div>))}
        </div>
        {comps.data?.items.length > 0 && (
          <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-slate-300">History</h3>
            <ul className="divide-y divide-ink-500/40">{comps.data.items.slice(0, 8).map((c) => (
              <li key={c._id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="text-slate-200">{c.name}</span>
                <span className="text-xs text-slate-500">{formatDate(c.startsAt)} → {c.endsAt ? formatDate(c.endsAt) : 'now'} · {c.finalStandings?.length ? `winner ${c.finalStandings[0].name} (${c.finalStandings[0].points})` : c.active ? 'in progress' : 'no entries'}</span></li>))}</ul></div>)}
      </section>

      {isAdmin && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Submissions</h2>
          <p className="mb-3 text-sm text-slate-400">Completions are self-reported. Void invalid ones to reverse their points and rebuild the student’s streak.</p>
          {subs.error ? <ErrorState error={subs.error} onRetry={subs.reload} /> : subs.loading && !subs.data ? <Skeleton className="h-52" /> : (<><DataTable columns={cols} rows={subs.data.items} rowKey={(c) => c._id} empty="No submissions yet." /><Pagination pagination={subs.data.pagination} onPage={setPage} /></>)}
        </section>)}

      <ConfirmModal open={!!reset} busy={busy} onClose={() => setReset(null)} onConfirm={doReset} title={`Reset ${reset} competition?`} confirmLabel="Reset period" danger
        message="The current period’s standings will be frozen in history and a new period begins immediately." />
      <Modal open={!!voiding} onClose={() => setVoiding(null)} title="Void submission"
        footer={<><Button variant="ghost" onClick={() => setVoiding(null)}>Cancel</Button><Button variant="danger" onClick={doVoid} disabled={busy || reason.trim().length < 3}>{busy && <Spinner />}Void & reverse points</Button></>}>
        <p className="mb-3 text-sm text-slate-300">{voiding?.user?.name} · {voiding?.question?.title} · {voiding?.date}</p>
        <Field label="Reason (visible to admins)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Confirmed false claim" /></Field>
      </Modal>
    </div>
  );
}
