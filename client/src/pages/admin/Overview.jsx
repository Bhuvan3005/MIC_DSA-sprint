import { Link } from 'react-router-dom';
import { CheckCircle2, Library, UserCheck, Users, Video, Zap } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { DifficultyBadge, ErrorState, PageHeader, Skeleton, StatCard } from '../../components/common/ui';
import { ActivityArea } from '../../components/dashboard/Charts';
import { formatDate } from '../../utils/format';

import Button from '../../components/common/Button';
export default function Overview() {
  const { data, loading, error, reload } = useFetch(() => adminApi.overview(), []);
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;
  const o = data?.overview;
  return (
    <div className="page space-y-6">
      <PageHeader title="Overview" subtitle="How the platform is doing right now." actions={<Button to="/admin/challenges" variant="primary">Schedule a challenge</Button>} />
      {loading && !o ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard icon={Users} label="Students" value={o.totalStudents} />
          <StatCard icon={UserCheck} tone="emerald" label="Active today" value={o.activeToday} />
          <StatCard icon={Library} tone="sky" label="Questions" value={o.totalQuestions} />
          <StatCard icon={Video} tone="amber" label="Video solutions" value={o.totalVideos} hint={`${o.publishedVideos} published`} />
          <StatCard icon={CheckCircle2} tone="rose" label="Completions" value={o.completionsTotal} hint={`${o.completionsToday} today`} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold">Weekly student activity</h2><p className="mb-3 text-xs text-slate-400">Completions and distinct active students per day</p>
          {loading && !o ? <Skeleton className="h-60" /> : <ActivityArea data={o.weeklyActivity} />}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Most popular questions</h2>
          {loading && !o ? <Skeleton className="h-48" /> : o.popularQuestions.length === 0 ? <p className="text-sm text-slate-400">No completions yet.</p> : (
            <ol className="space-y-3">{o.popularQuestions.map((q, i) => (
              <li key={q.id} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-500/15 font-mono text-xs text-brand-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{q.title}</span><DifficultyBadge level={q.difficulty} /><span className="w-8 text-right text-sm font-bold text-white">{q.completions}</span></li>))}</ol>)}
        </section>
      </div>
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Zap size={18} className="text-brand-400" />Recent registrations</h2><Link to="/admin/students" className="text-sm text-brand-400 hover:underline">All students →</Link></div>
        {loading && !o ? <Skeleton className="h-32" /> : o.recentStudents.length === 0 ? <p className="text-sm text-slate-400">No students have registered yet.</p> : (
          <ul className="divide-y divide-ink-500/40">{o.recentStudents.map((s) => (
            <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><div><div className="font-medium text-white">{s.name}</div><div className="text-xs text-slate-400">{s.email}</div></div><div className="text-right text-xs text-slate-400"><div>{s.college}</div><div>{formatDate(s.createdAt)}</div></div></li>))}</ul>)}
      </section>
    </div>
  );
}
