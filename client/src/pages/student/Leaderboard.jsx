import { useEffect, useState } from 'react';
import { Search, Trophy } from 'lucide-react';
import { useFetch, useDebounced } from '../../hooks/useFetch';
import { leaderboardApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Tabs } from '../../components/common/ui';
import { LeaderboardTable, Podium } from '../../components/leaderboard/LeaderboardTable';
import { COLLEGES } from '../../utils/format';

const tabs = [{ value: 'global', label: 'Global' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'college', label: 'College-wise' }];

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('global');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState(user?.college || '');
  const q = useDebounced(search);
  useEffect(() => { setPage(1); }, [tab, q, college]);

  const { data, loading, error, reload } = useFetch(
    () => leaderboardApi.board(tab, { page, limit: 15, search: q, college: tab === 'college' ? college : '' }),
    [tab, page, q, college],
  );
  const items = data?.items || [];
  const showPodium = page === 1 && !q && items.length >= 3;

  return (
    <div className="page">
      <PageHeader title="Leaderboard" subtitle="Points are calculated on our servers from your verified completions."
        actions={tab === 'college' && (
          <select className="input !w-auto" value={college} onChange={(e) => setCollege(e.target.value)} aria-label="College">
            {!college && <option value="">Select college</option>}
            {COLLEGES.map((c) => <option key={c}>{c}</option>)}
          </select>
        )} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input !pl-9" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
        </div>
      </div>

      {data?.me && (
        <div className="mb-5 flex items-center justify-between border-y border-white/10 px-1 py-4">
          <span className="text-sm text-slate-300">Your position</span>
          <span className="text-lg font-bold text-white">#{data.me.rank} <span className="ml-2 text-sm font-medium text-slate-400">{data.me.points} pts</span></span>
        </div>
      )}
      {tab !== 'global' && tab !== 'college' && data?.window?.competition && <p className="mb-3 text-xs text-slate-400">Current competition: <b className="text-slate-200">{data.window.competition.name}</b></p>}

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Trophy} title={tab === 'college' && !college ? 'Pick a college' : 'No rankings yet'}
          hint={tab === 'weekly' || tab === 'monthly' ? 'Complete a daily challenge to appear on this period’s board.' : 'Nobody matches this view yet.'} />
      ) : (
        <>
          {showPodium && <Podium rows={items.slice(0, 3)} showCompleted={tab === 'global' || tab === 'college'} />}
          <LeaderboardTable rows={showPodium ? items.slice(3) : items} meId={user?.id} />
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
