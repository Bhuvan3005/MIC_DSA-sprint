import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, PlayCircle, Search } from 'lucide-react';
import { useFetch, useDebounced } from '../../hooks/useFetch';
import { videoApi } from '../../services';
import { DifficultyBadge, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, SkeletonCards, TopicTags } from '../../components/common/ui';
import VideoCard from '../../components/videos/VideoCard';
import VideoPlayer from '../../components/videos/VideoPlayer';
import { DIFFICULTIES, TOPICS, formatDate } from '../../utils/format';

import Button from '../../components/common/Button';
export function VideoLibrary() {
  const [sp] = useSearchParams();
  const [f, setF] = useState({ search: sp.get('q') || '', difficulty: '', topic: '' });
  useEffect(() => { setF((x) => ({ ...x, search: sp.get('q') || '' })); }, [sp]);
  const [page, setPage] = useState(1);
  const q = useDebounced(f.search);
  useEffect(() => { setPage(1); }, [q, f.difficulty, f.topic]);
  const { data, loading, error, reload } = useFetch(() => videoApi.list({ ...f, search: q, page, limit: 12 }), [q, f.difficulty, f.topic, page]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="page">
      <PageHeader title="Video solutions" subtitle="Walkthroughs of every daily question, with chapters you can jump to." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input !pl-9" placeholder="Search by question…" value={f.search} onChange={set('search')} aria-label="Search videos" /></div>
        <select className="input" value={f.difficulty} onChange={set('difficulty')} aria-label="Difficulty"><option value="">All difficulties</option>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="input" value={f.topic} onChange={set('topic')} aria-label="Topic"><option value="">All topics</option>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={6} className="h-64" /> : data.items.length === 0
        ? <EmptyState icon={PlayCircle} title="No videos found" hint="Try different filters. New solutions are added regularly." />
        : (<><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((v) => <VideoCard key={v.id} video={v} />)}</div><Pagination pagination={data.pagination} onPage={setPage} /></>)}
    </div>
  );
}

export function VideoDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch(() => videoApi.get(slug), [slug]);
  if (error) {
    return <div className="page"><Link to="/videos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} />All videos</Link>
      {error.status === 404 ? <EmptyState icon={PlayCircle} title="Video not available" hint="This solution doesn’t exist or hasn’t been published yet." /> : <ErrorState error={error} onRetry={reload} />}</div>;
  }
  if (loading && !data) return <div className="page space-y-4"><Skeleton className="aspect-video w-full max-w-4xl" /><Skeleton className="h-10 w-1/2" /></div>;
  const v = data.video; const q = v.question;
  return (
    <div className="page space-y-6">
      <Link to="/videos" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} />All videos</Link>
      <VideoPlayer src={v.secureUrl} poster={v.thumbnailUrl} chapters={v.chapters} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">{v.title}</h1><DifficultyBadge level={v.difficulty || q.difficulty} /></div>
          <TopicTags topics={v.topics} max={6} />
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{v.description || 'No description provided.'}</p>
          <p className="text-xs text-slate-500">Published {formatDate(v.createdAt)}</p>
        </div>
        <aside className="space-y-4">
          <div className="card p-4"><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Problem</div>
            <div className="mb-3 font-semibold text-white">{q.number ? `${q.number}. ` : ''}{q.title}</div>
            <Button href={q.leetcodeUrl} target="_blank" variant="primary" className="w-full">Open on LeetCode <ExternalLink size={15} /></Button></div>
          {data.related.length > 0 && (
            <div className="card p-4"><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Related solutions</div>
              <ul className="space-y-1">{data.related.map((r) => (
                <li key={r.id}><Link to={`/videos/${r.slug}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-ink-600"><span className="truncate">{r.title}</span><DifficultyBadge level={r.difficulty} /></Link></li>))}</ul></div>)}
        </aside>
      </div>
    </div>
  );
}
