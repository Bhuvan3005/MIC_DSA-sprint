import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Flame, Medal } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { userApi, challengeApi, leaderboardApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, EmptyState, ErrorState, Skeleton } from '../../components/common/ui';
import Button from '../../components/common/Button';
import Heatmap from '../../components/dashboard/Heatmap';
import AchievementsPanel, { UnlockPopups } from '../../components/dashboard/Achievements';
import MiniCalendar from '../../components/dashboard/MiniCalendar';
import ChallengeCard from '../../components/challenges/ChallengeCard';
import EligibilityNotice from '../../components/challenges/EligibilityNotice';
import { assetUrl, cn, formatDate } from '../../utils/format';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

/** Circular progress for today's problems. */
function Ring({ done, total, size = 88 }) {
  const r = (size - 12) / 2; const c = 2 * Math.PI * r; const pct = total ? done / total : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${total} problems done today`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="7" className="stroke-white/10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', pct === 1 ? 'stroke-emerald-400' : 'stroke-brand-400')} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-heading text-xl font-semibold text-white">{done}<span className="text-sm text-zinc-500">/{total}</span></div>
    </div>
  );
}

const Heading = ({ children, aside }) => (
  <div className="mb-5 flex items-end justify-between gap-3">
    <h2 className="!font-normal text-3xl sm:text-4xl">{children}</h2>
    {aside}
  </div>
);
const More = ({ to, children = 'View all' }) => <Link to={to} className="pb-1 text-sm text-zinc-500 transition-colors hover:text-white">{children}</Link>;

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => userApi.dashboard(), []);
  const heat = useFetch(() => userApi.heatmap(), []);
  const ach = useFetch(() => userApi.achievements(), []);
  const board = useFetch(() => leaderboardApi.board('global', { page: 1, limit: 5 }), []);
  const [busyId, setBusyId] = useState(null);
  const [unlocked, setUnlocked] = useState([]);

  const complete = async (q) => {
    setBusyId(q.id);
    try {
      const r = await challengeApi.complete(q.id);
      toast.success(`+${r.pointsEarned} points${r.perfectDay ? ' · Perfect day!' : ''}`);
      if (r.newBadges?.length) setUnlocked(r.newBadges);
      setUser((u) => ({ ...u, totalPoints: r.totalPoints }));
      reload(); board.reload(); heat.reload(); ach.reload();
    } catch (err) { toast.error(err.message); } finally { setBusyId(null); }
  };

  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;
  const d = data?.dashboard;
  const blocked = user?.role === 'ADMIN' || !user?.leetcodeUsername;
  const qs = d?.todayChallenge?.questions || [];
  const done = qs.filter((q) => q.completed).length;
  const total = qs.length;
  const streak = d?.streak.current || 0;
  const toWeek = streak >= 7 ? null : 7 - streak;
  const today = d?.weeklyActivity?.at(-1)?.date;

  const message = !d ? '' : total === 0 ? 'No challenge is published today. Watch a video solution while you wait.'
    : done === total ? 'All done for today. Nice work, see you tomorrow.'
      : done === 0 ? 'Two problems are waiting for you. Start with the first one.' : 'One more to go. You’re almost there.';

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-6 pt-8 sm:px-6 lg:px-8">
      <UnlockPopups items={unlocked} onClear={() => setUnlocked([])} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-12">
          <header className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <p className="text-sm text-zinc-500">{formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <h1 className="mt-1 !font-normal text-4xl leading-tight sm:text-5xl">{greeting()}, {user?.name?.split(' ')[0]}</h1>
              <p className="mt-2 text-[15px] text-zinc-400">{message}</p>
            </div>
            {d && (
              <div className="flex items-center gap-5">
                <div className="hidden gap-6 sm:flex">
                  {[['Points', d.user.totalPoints], ['Rank', d.rank ? `#${d.rank}` : '-'], ['Solved', d.user.totalCompleted]].map(([k, v]) => (
                    <div key={k} className="text-right"><div className="font-heading text-2xl font-medium text-white">{v}</div><div className="text-xs text-zinc-500">{k}</div></div>
                  ))}
                </div>
                <Ring done={done} total={total} />
              </div>
            )}
          </header>

          <EligibilityNotice user={user} />

          <section>
            <Heading aside={<More to="/daily-challenges">Past challenges</More>}>Today’s challenges</Heading>
            {loading && !d ? <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
              : qs.length ? (
                <>
                  {d.todayChallenge.note && <p className="mb-4 text-sm text-zinc-400">{d.todayChallenge.note}</p>}
                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {qs.map((q, i) => <ChallengeCard key={q.id} question={q} index={i} busy={busyId === q.id} onComplete={complete} blocked={blocked} />)}
                  </div>
                </>
              ) : <EmptyState title="Nothing scheduled today" hint="New problems drop daily. Meanwhile, watch a video solution." action={<Button to="/videos">Browse videos</Button>} />}
          </section>

          <section>
            <Heading>Your streak</Heading>
            <div className="card rounded-[28px] p-6">
              {loading && !d ? <Skeleton className="h-40" /> : (
                <>
                  <div className="mb-6 flex flex-wrap items-center gap-x-10 gap-y-4">
                    <div className="flex items-center gap-3">
                      <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', streak ? 'bg-emerald-400/15 text-emerald-400' : 'bg-white/[0.06] text-zinc-500')}><Flame size={24} strokeWidth={1.8} /></span>
                      <div>
                        <div className="font-heading text-4xl font-medium leading-none text-white">{streak}<span className="ml-1 text-lg text-zinc-500">{streak === 1 ? 'day' : 'days'}</span></div>
                        <div className="mt-1 text-sm text-zinc-400">current streak</div>
                      </div>
                    </div>
                    <div><div className="font-heading text-2xl font-medium text-white">{d.streak.longest}</div><div className="text-xs text-zinc-500">longest streak</div></div>
                    <div><div className="font-heading text-2xl font-medium text-white">{d.streak.monthlyActiveDays ?? 0}</div><div className="text-xs text-zinc-500">active days this month</div></div>
                  </div>
                  {heat.error ? <p className="text-sm text-zinc-500">Couldn’t load your activity right now.</p>
                    : heat.loading && !heat.data ? <Skeleton className="h-32" />
                      : <Heatmap data={heat.data.heatmap} today={today} perDay={total || 2} />}
                  <p className="mt-4 border-t border-white/[0.08] pt-4 text-xs text-zinc-500">
                    {toWeek ? `${toWeek} more ${toWeek === 1 ? 'day' : 'days'} in a row to reach your 7-day bonus.` : 'You’ve reached the 7-day bonus. Next stop: 30 days.'}
                    {' '}A square turns brighter green the more of the day you finish.
                  </p>
                </>
              )}
            </div>
          </section>

        </div>

        {/* ── Side rail ── */}
        <aside className="min-w-0 space-y-5 xl:pt-2">
          <AchievementsPanel data={ach.data} loading={ach.loading} />

          <section className="card rounded-[28px] p-6">
            {loading && !d ? <Skeleton className="h-64" /> : <MiniCalendar data={heat.data?.heatmap || []} today={today} perDay={total || 2} />}
          </section>

          <section className="card rounded-[28px] p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold text-white">Leaderboard</h3><Link to="/leaderboard" className="text-xs text-zinc-500 hover:text-white">See all</Link></div>
            {board.loading && !board.data ? <Skeleton className="h-40" /> : (board.data?.items || []).length === 0
              ? <p className="text-sm text-zinc-500">No one has scored yet. Be the first.</p>
              : (
                <ol className="space-y-1">
                  {board.data.items.map((r) => (
                    <li key={r.userId}>
                      <Link to={`/profile/${r.userId}`} className={cn('flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-white/[0.04]', r.userId === user?.id && 'bg-white/[0.06]')}>
                        <span className="grid w-5 place-items-center text-sm font-semibold tabular-nums text-zinc-500">{r.rank <= 3 ? <Medal size={16} className={r.rank === 1 ? 'text-mic-amber' : r.rank === 2 ? 'text-zinc-300' : 'text-mic-orange'} /> : r.rank}</span>
                        <Avatar name={r.name} seed={r.avatarSeed} src={assetUrl(r.avatarUrl)} size={30} />
                        <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{r.name}{r.userId === user?.id && <span className="ml-1.5 text-xs text-brand-400">you</span>}</span>
                        <span className="text-sm font-semibold tabular-nums text-white">{r.points}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
          </section>

        </aside>
      </div>
    </div>
  );
}
