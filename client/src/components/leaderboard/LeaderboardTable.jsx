import { Link } from 'react-router-dom';
import { Crown, Flame, Medal } from 'lucide-react';
import { Avatar } from '../common/ui';
import { assetUrl, cn } from '../../utils/format';

const podium = [
  { ring: 'ring-amber-400/60', tone: 'text-amber-300', label: '1st' },
  { ring: 'ring-slate-300/50', tone: 'text-slate-200', label: '2nd' },
  { ring: 'ring-orange-400/50', tone: 'text-orange-300', label: '3rd' },
];

export function Podium({ rows, showCompleted }) {
  if (!rows || rows.length === 0) return null;
  const order = [rows[1], rows[0], rows[2]].map((r, i) => (r ? { r, i: [1, 0, 2][i] } : null));
  return (
    <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((o, k) => !o ? <div key={k} /> : (
        <Link to={`/profile/${o.r.userId}`} key={o.r.userId}
          className={cn('card card-hover flex flex-col items-center gap-2 p-3 text-center ring-1 sm:p-5', podium[o.i].ring, o.i === 0 && 'sm:-translate-y-3')}>
          <div className="relative">
            <Avatar name={o.r.name} seed={o.r.avatarSeed} src={assetUrl(o.r.avatarUrl)} size={o.i === 0 ? 64 : 52} />
            <span className={cn('absolute -bottom-1 -right-1 rounded-full bg-ink-900 p-1', podium[o.i].tone)}>{o.i === 0 ? <Crown size={14} /> : <Medal size={14} />}</span>
          </div>
          <div className="w-full min-w-0">
            <div className="truncate text-sm font-bold text-white sm:text-base">{o.r.name}</div>
            <div className="truncate text-[11px] text-slate-400 sm:text-xs">{o.r.college || '-'}</div>
          </div>
          <div className={cn('text-lg font-extrabold tabular-nums sm:text-2xl', podium[o.i].tone)}>{o.r.points}<span className="ml-1 text-[10px] font-medium text-slate-500">pts</span></div>
          <div className="text-[11px] text-slate-500">{podium[o.i].label}{showCompleted ? ` · ${o.r.questionsCompleted} solved` : ''}</div>
        </Link>
      ))}
    </div>
  );
}

export function LeaderboardTable({ rows, meId }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-500/60 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 font-semibold">Rank</th><th className="px-4 py-3 font-semibold">Student</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">College</th>
              <th className="px-4 py-3 text-right font-semibold">Points</th>
              <th className="px-4 py-3 text-right font-semibold">Solved</th>
              <th className="px-4 py-3 text-right font-semibold">Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className={cn('border-b border-ink-500/30 transition hover:bg-ink-700/50', r.userId === meId && 'bg-brand-500/10')}>
                <td className="px-4 py-3">
                  <span className={cn('inline-grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-xs font-bold tabular-nums',
                    r.rank === 1 ? 'bg-amber-400/20 text-amber-300' : r.rank === 2 ? 'bg-slate-300/15 text-slate-200' : r.rank === 3 ? 'bg-orange-400/20 text-orange-300' : 'text-slate-400')}>{r.rank}</span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/profile/${r.userId}`} className="flex items-center gap-3 hover:text-white">
                    <Avatar name={r.name} seed={r.avatarSeed} src={assetUrl(r.avatarUrl)} size={32} />
                    <span className="font-semibold text-slate-100">{r.name}{r.userId === meId && <span className="ml-2 rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-400">YOU</span>}</span>
                  </Link>
                </td>
                <td className="hidden max-w-[220px] truncate px-4 py-3 text-slate-400 md:table-cell">{r.college || '-'}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-white">{r.points}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">{r.questionsCompleted}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                  <span className="inline-flex items-center gap-1">{r.currentStreak > 0 && <Flame size={14} className="text-orange-400" />}{r.currentStreak}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
