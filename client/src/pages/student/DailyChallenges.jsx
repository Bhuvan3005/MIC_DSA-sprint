import { useState } from 'react';
import { CalendarCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { challengeApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { EmptyState, ErrorState, PageHeader, Pagination, SkeletonCards } from '../../components/common/ui';
import ChallengeCard from '../../components/challenges/ChallengeCard';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import EligibilityNotice from '../../components/challenges/EligibilityNotice';

export default function DailyChallenges() {
  const toast = useToast();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const today = useFetch(() => challengeApi.today(), []);
  const history = useFetch(() => challengeApi.history({ page, limit: 7 }), [page]);
  const [busyId, setBusyId] = useState(null);

  const complete = async (q) => {
    setBusyId(q.id);
    try {
      const r = await challengeApi.complete(q.id);
      toast.success(`+${r.pointsEarned} points${r.perfectDay ? ' · Both done! Daily bonus earned.' : ''}`);
      r.newBadges?.forEach((b) => toast.info(`Achievement unlocked: ${b.name}`));
      today.reload(); history.reload();
    } catch (err) { toast.error(err.message); } finally { setBusyId(null); }
  };

  const c = today.data?.challenge;
  const past = (history.data?.items || []).filter((x) => x.date !== today.data?.date);

  return (
    <div className="page">
      <PageHeader title="Daily challenges" subtitle="Two hand-picked LeetCode problems every day. Solve them on LeetCode, then click I solved it to verify your submission against your public LeetCode profile." />
      <div className="mb-6"><EligibilityNotice user={user} /></div>

      {today.error ? <ErrorState error={today.error} onRetry={today.reload} /> : today.loading && !c ? <SkeletonCards count={2} className="h-56" /> : c ? (
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={18} className="text-brand-400" />Today · {formatDate(c.date)}</h2>
            <span className="rounded-full bg-ink-600 px-3 py-0.5 text-xs font-semibold text-slate-300">{c.completedCount}/{c.total} done</span>
            {c.perfect && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-300"><CheckCircle2 size={13} />Perfect day</span>}
          </div>
          {c.note && <p className="mb-3 text-sm text-slate-400">{c.note}</p>}
          <div className="grid gap-5 md:grid-cols-2">{c.questions.map((q, i) => <ChallengeCard key={q.id} question={q} index={i} busy={busyId === q.id} onComplete={complete} blocked={user?.role === 'ADMIN' || !user?.leetcodeUsername} />)}</div>
        </section>
      ) : <div className="mb-10"><EmptyState icon={CalendarCheck} title="No challenge today yet" hint="Check back soon. Today’s questions haven’t been published." /></div>}

      <h2 className="mb-3 text-lg font-semibold">Previous days</h2>
      {history.error ? <ErrorState error={history.error} onRetry={history.reload} /> : history.loading && !history.data ? <SkeletonCards count={3} /> : past.length === 0
        ? <EmptyState title="No earlier challenges" hint="Past challenges will appear here." />
        : (
          <div className="space-y-3">
            {past.map((day) => (
              <div key={day.id} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-white">{formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className={`text-xs font-semibold ${day.perfect ? 'text-emerald-300' : 'text-slate-400'}`}>{day.completedCount}/{day.total} completed</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">{day.questions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-500/50 bg-ink-700/30 px-3 py-2.5">
                    <div className="min-w-0"><a href={q.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-slate-100 hover:text-brand-400">{q.title}</a><span className="text-xs text-slate-500">{q.difficulty}</span></div>
                    {q.completed ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" /> : <span className="text-xs text-slate-500">missed</span>}
                  </div>))}</div>
              </div>
            ))}
            <Pagination pagination={history.data?.pagination} onPage={setPage} />
          </div>
        )}
    </div>
  );
}
