import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, ExternalLink, PlayCircle, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { challengeApi } from '../../services';
import { DifficultyBadge, Skeleton } from '../common/ui';
import { cn } from '../../utils/format';

const key = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pretty = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

/** What was assigned on a chosen day, and whether you solved each problem. */
function DayDetail({ date, onClose }) {
  const { data, loading, error } = useFetch(() => challengeApi.byDate(date), [date]);
  const c = data?.challenge;
  return (
    <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">{pretty(date)}</div>
          {c && <div className="text-xs text-zinc-500">{c.completedCount} of {c.total} solved{c.perfect ? ' · perfect day' : ''}</div>}
        </div>
        <button onClick={onClose} aria-label="Close day details" className="rounded-lg p-1 text-zinc-500 hover:text-white"><X size={15} /></button>
      </div>
      {loading && !data ? <Skeleton className="h-16" />
        : error ? <p className="text-sm text-zinc-500">No challenge was scheduled on this day.</p>
          : (
            <ul className="space-y-3">
              {c.questions.map((q) => (
                <li key={q.id} className="flex items-start gap-3">
                  <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', q.completed ? 'bg-emerald-400 text-ink-900' : 'border border-white/20 text-transparent')}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className={cn('text-sm font-medium', q.completed ? 'text-white' : 'text-zinc-300')}>{q.title}</span><DifficultyBadge level={q.difficulty} /></div>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <span className={q.completed ? 'text-emerald-400' : 'text-zinc-500'}>{q.completed ? 'Solved' : 'Not solved'}</span>
                      <a href={q.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-zinc-400 hover:text-white">LeetCode <ExternalLink size={11} /></a>
                      {q.hasVideo && <Link to={`/videos/${q.slug}`} className="inline-flex items-center gap-1 text-brand-400 hover:underline"><PlayCircle size={12} />Solution</Link>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
    </div>
  );
}

/** Month calendar: solved days light up, and any past day opens its problems. `data` = [{date, count}]. */
export default function MiniCalendar({ data = [], today, perDay = 2 }) {
  const base = today ? new Date(`${today}T00:00:00`) : new Date();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const counts = useMemo(() => new Map(data.map((d) => [d.date, d.count])), [data]);

  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const y = view.getFullYear(); const m = view.getMonth();
  const lead = view.getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const todayKey = key(base.getFullYear(), base.getMonth(), base.getDate());
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-1">
          <button onClick={() => setOffset((o) => o - 1)} aria-label="Previous month" className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"><ChevronLeft size={16} /></button>
          <button onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset >= 0} aria-label="Next month" className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs">
        {DOW.map((d) => <div key={d} className="pb-1.5 text-zinc-600">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const k = key(y, m, d); const n = counts.get(k) || 0; const full = n >= perDay; const isToday = k === todayKey;
          const future = k > todayKey; const sel = selected === k;
          return (
            <div key={k} className="grid place-items-center">
              <button type="button" disabled={future} onClick={() => setSelected(sel ? null : k)} aria-pressed={sel}
                aria-label={`${pretty(k)}${n ? `, ${n} solved` : ''}`} title={n ? `${n} solved` : undefined}
                className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px] tabular-nums transition-colors disabled:cursor-default',
                  full ? 'bg-emerald-400 font-semibold text-ink-900' : n ? 'bg-emerald-400/25 text-emerald-300' : future ? 'text-zinc-700' : 'text-zinc-400 hover:bg-white/[0.07]',
                  isToday && !full && 'ring-1 ring-white/50', sel && 'ring-2 ring-white')}>{d}</button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Full day</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />Partial</span>
        {!selected && <span className="ml-auto">Tap a day for details</span>}
      </div>
      {selected && <DayDetail date={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
