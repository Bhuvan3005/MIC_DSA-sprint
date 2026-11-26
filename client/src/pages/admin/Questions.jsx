import { useEffect, useState } from 'react';
import { Link2, Pencil, Plus, Search, Star, Trash2, Video } from 'lucide-react';
import { useFetch, useDebounced } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal, DifficultyBadge, ErrorState, Field, Modal, PageHeader, Pagination, Skeleton, Spinner, TopicTags } from '../../components/common/ui';
import { DataTable, StatusPill } from '../../components/admin/shared';
import { DIFFICULTIES, TOPICS, slugFromLeetcodeUrl } from '../../utils/format';

import Button from '../../components/common/Button';
const blank = { title: '', slug: '', leetcodeUrl: '', number: '', difficulty: 'Easy', topics: [], tags: '', description: '', recommendedMinutes: 30, featured: false };

function QuestionForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(initial ? { ...initial, number: initial.number || '', tags: (initial.tags || []).join(', ') } : blank);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleTopic = (t) => setF({ ...f, topics: f.topics.includes(t) ? f.topics.filter((x) => x !== t) : [...f.topics, t] });

  const onUrl = (e) => {
    const url = e.target.value; const slug = slugFromLeetcodeUrl(url);
    setF({ ...f, leetcodeUrl: url, slug: f.slug || slug });
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrs({});
    const body = {
      title: f.title, slug: f.slug, leetcodeUrl: f.leetcodeUrl || undefined, number: f.number ? Number(f.number) : undefined,
      difficulty: f.difficulty, topics: f.topics, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      description: f.description || undefined, recommendedMinutes: Number(f.recommendedMinutes) || 30, featured: !!f.featured,
    };
    try {
      if (initial) await adminApi.updateQuestion(initial.id, body); else await adminApi.createQuestion(body);
      toast.success(initial ? 'Question updated' : 'Question added'); onSaved();
    } catch (err) {
      const m = {}; (err.details || []).forEach((d) => { m[d.field] = d.message; });
      setErrs(Object.keys(m).length ? m : { form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} wide title={initial ? 'Edit question' : 'Add question'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button form="qform" variant="primary" disabled={busy}>{busy && <Spinner />}{initial ? 'Save changes' : 'Add question'}</Button></>}>
      <form id="qform" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="LeetCode URL" error={errs.leetcodeUrl} hint="Paste the problem link to auto-fill the slug."><input className="input" placeholder="https://leetcode.com/problems/two-sum/" value={f.leetcodeUrl} onChange={onUrl} /></Field></div>
        <Field label="Title" error={errs.title}><input className="input" required value={f.title} onChange={set('title')} /></Field>
        <Field label="Problem slug" error={errs.slug}><input className="input font-mono" required value={f.slug} onChange={set('slug')} placeholder="two-sum" /></Field>
        <Field label="Question number" error={errs.number}><input className="input" type="number" min="1" value={f.number} onChange={set('number')} /></Field>
        <Field label="Difficulty"><select className="input" value={f.difficulty} onChange={set('difficulty')}>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Recommended time (min)" error={errs.recommendedMinutes}><input className="input" type="number" min="1" value={f.recommendedMinutes} onChange={set('recommendedMinutes')} /></Field>
        <Field label="Tags (comma separated)"><input className="input" value={f.tags} onChange={set('tags')} placeholder="amazon, classic" /></Field>
        <div className="sm:col-span-2"><span className="label">Topics</span>
          <div className="flex flex-wrap gap-2">{TOPICS.map((t) => (
            <button key={t} type="button" onClick={() => toggleTopic(t)} aria-pressed={f.topics.includes(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${f.topics.includes(t) ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-500 text-slate-400 hover:text-white'}`}>{t}</button>))}</div></div>
        <div className="sm:col-span-2"><Field label="Short description" error={errs.description}><textarea className="input min-h-[80px]" maxLength={2000} value={f.description} onChange={set('description')} /></Field></div>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-violet-500" checked={!!f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} />Featured question</label>
        {errs.form && <p className="text-sm text-rose-300 sm:col-span-2" role="alert">{errs.form}</p>}
      </form>
    </Modal>
  );
}

export default function Questions() {
  const toast = useToast();
  const [f, setF] = useState({ search: '', difficulty: '', topic: '' });
  const [page, setPage] = useState(1);
  const q = useDebounced(f.search);
  useEffect(() => { setPage(1); }, [q, f.difficulty, f.topic]);
  const { data, loading, error, reload } = useFetch(() => adminApi.questions({ ...f, search: q, page, limit: 12 }), [q, f.difficulty, f.topic, page]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    setBusy(true);
    try { await adminApi.deleteQuestion(deleting.id); toast.success('Question deleted'); setDeleting(null); reload(); }
    catch (err) { toast.error(err.message); setDeleting(null); } finally { setBusy(false); }
  };
  const feature = async (r) => { try { await adminApi.toggleFeatured(r.id); reload(); } catch (err) { toast.error(err.message); } };

  const cols = [
    { key: 'title', label: 'Question', render: (r) => <div className="min-w-0"><div className="font-semibold text-white">{r.number ? `${r.number}. ` : ''}{r.title}</div><a href={r.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-400"><Link2 size={11} />{r.slug}</a></div> },
    { key: 'difficulty', label: 'Difficulty', render: (r) => <DifficultyBadge level={r.difficulty} /> },
    { key: 'topics', label: 'Topics', render: (r) => <TopicTags topics={r.topics} max={2} /> },
    { key: 'video', label: 'Video', render: (r) => r.video ? <StatusPill tone={r.video.published ? 'emerald' : 'amber'}><Video size={11} className="mr-1 inline" />{r.video.published ? 'Live' : 'Draft'}</StatusPill> : <span className="text-xs text-slate-500">None</span> },
    { key: 'actions', label: '', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button onClick={() => feature(r)} aria-label="Toggle featured" className={`rounded-lg p-2 hover:bg-ink-600 ${r.featured ? 'text-amber-300' : 'text-slate-500'}`}><Star size={16} fill={r.featured ? 'currentColor' : 'none'} /></button>
        <button onClick={() => setEditing(r)} aria-label="Edit" className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white"><Pencil size={16} /></button>
        <button onClick={() => setDeleting(r)} aria-label="Delete" className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 size={16} /></button>
      </div>) },
  ];

  return (
    <div className="page">
      <PageHeader title="Question bank" subtitle="Every LeetCode problem students can be assigned." actions={<Button variant="primary" onClick={() => setEditing({})}><Plus size={16} />Add question</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input !pl-9" placeholder="Search title, slug or number" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} aria-label="Search questions" /></div>
        <select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} aria-label="Difficulty"><option value="">All difficulties</option>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} aria-label="Topic"><option value="">All topics</option>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-72" /> : (
        <><DataTable columns={cols} rows={data.items} empty="No questions match. Add your first one!" /><Pagination pagination={data.pagination} onPage={setPage} /></>)}
      {editing && <QuestionForm initial={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <ConfirmModal open={!!deleting} danger busy={busy} onClose={() => setDeleting(null)} onConfirm={del} title="Delete question?" confirmLabel="Delete"
        message={`“${deleting?.title}” and its video solution will be permanently removed. Questions used in a challenge or roadmap can’t be deleted.`} />
    </div>
  );
}
