import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { ErrorState, PageHeader, Skeleton, Tabs } from '../../components/common/ui';
import { ActivityArea, DifficultyPie, HBar, SimpleLine } from '../../components/dashboard/Charts';

const Panel = ({ title, hint, children, className = '' }) => (
  <section className={`card p-5 ${className}`}><h2 className="text-lg font-semibold">{title}</h2>{hint && <p className="mb-3 text-xs text-slate-400">{hint}</p>}<div className="mt-2">{children}</div></section>
);

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useFetch(() => adminApi.analytics(days), [days]);
  const a = data?.analytics;
  return (
    <div className="page space-y-6">
      <PageHeader title="Analytics" subtitle="Engagement, content performance and growth."
        actions={<Tabs value={days} onChange={setDays} tabs={[{ value: 7, label: '7d' }, { value: 30, label: '30d' }, { value: 90, label: '90d' }]} />} />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !a ? <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div> : (
        <>
          <Panel title="Daily engagement" hint="Completions and distinct active students"><ActivityArea data={a.series} height={280} /></Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Signups" hint={`New students, last ${a.days} days`}>{a.signups.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No signups in this period.</p> : <SimpleLine data={a.signups} />}</Panel>
            <Panel title="Completions by difficulty">{a.completionsByDifficulty.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No completions yet.</p> : (<><DifficultyPie data={a.completionsByDifficulty} />
              <div className="flex justify-center gap-4 text-xs text-slate-400">{a.completionsByDifficulty.map((d) => <span key={d.difficulty}>{d.difficulty}: <b className="text-white">{d.count}</b></span>)}</div></>)}</Panel>
            <Panel title="Popular topics">{a.completionsByTopic.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No data yet.</p> : <HBar data={a.completionsByTopic} labelKey="topic" />}</Panel>
            <Panel title="Top colleges by students">{a.colleges.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No data yet.</p> : <HBar data={a.colleges} labelKey="college" valueKey="students" />}</Panel>
          </div>
          <Panel title="Points issued by type" hint="Server-calculated ledger totals">
            {a.pointsByType.length === 0 ? <p className="text-sm text-slate-500">No points awarded yet.</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{a.pointsByType.map((p) => (
                <div key={p.type} className="rounded-xl bg-ink-700/40 p-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{p.type.replaceAll('_', ' ')}</div><div className="mt-1 text-xl font-bold text-white">{p.points}</div><div className="text-xs text-slate-500">{p.count} awards</div></div>))}</div>)}
          </Panel>
        </>)}
    </div>
  );
}
