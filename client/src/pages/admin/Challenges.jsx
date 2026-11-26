import { useState } from 'react';
import { CalendarPlus, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal, DifficultyBadge, ErrorState, Field, Modal, PageHeader, Pagination, Skeleton, Spinner } from '../../components/common/ui';
import { QuestionPicker, StatusPill } from '../../components/admin/shared';
import ChallengeCard from '../../components/challenges/ChallengeCard';
import { formatDate } from '../../utils/format';

import Button from '../../components/common/Button';
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const statusTone = { live: 'emerald', scheduled: 'sky', past: 'slate', unpublished: 'amber' };

function ChallengeForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [date, setDate] = useState(initial?.date || tomorrow());
  const [qs, setQs] = useState(initial ? initial.questions.map((q) => ({ ...q })) : [null, null]);
  const [note, setNote] = useState(initial?.note || '');
  const [published, setPublished] = useState(initial?.published ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = initial && initial.completions > 0;

  const save = async () => {
    setError('');
    if (qs.some((q) => !q)) return setError('Select both questions');
    setBusy(true);
    try {
      const body = { date, questions: qs.map((q) => q.id), published, note: note || undefined };
      if (initial) await adminApi.updateChallenge(initial.id, locked ? { published, note } : body); else await adminApi.createChallenge(body);
      toast.success(initial ? 'Challenge updated' : 'Challenge scheduled'); onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} wide title={initial ? `Edit challenge · ${initial.date}` : 'Schedule a challenge'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>{busy && <Spinner />}{initial ? 'Save' : 'Schedule'}</Button></>}>
      <div className="space-y-4">
        {locked && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{initial.completions} completions exist, so the date and questions are locked. You can still unpublish or edit the note.</p>}
        <Field label="Challenge date (IST)"><input type="date" className="input" value={date} disabled={!!initial} onChange={(e) => setDate(e.target.value)} /></Field>
        {qs.map((q, i) => (
          <Field key={i} label={`Question ${i + 1}`}><QuestionPicker value={q} disabled={locked} excludeIds={qs.filter(Boolean).map((x) => x.id)}
            onChange={(v) => setQs(qs.map((x, j) => (j === i ? v : x)))} /></Field>))}
        <Field label="Note for students (optional)"><input className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-violet-500" checked={published} onChange={(e) => setPublished(e.target.checked)} />Published (visible to students on its date)</label>
        {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export default function Challenges() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => adminApi.challenges({ page, limit: 10 }), [page]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const togglePublish = async (c) => { try { await adminApi.updateChallenge(c.id, { published: !c.published }); toast.success(c.published ? 'Unpublished' : 'Published'); reload(); } catch (err) { toast.error(err.message); } };
  const del = async () => { setBusy(true); try { await adminApi.deleteChallenge(deleting.id); toast.success('Challenge deleted'); setDeleting(null); reload(); } catch (err) { toast.error(err.message); setDeleting(null); } finally { setBusy(false); } };
  const openPreview = async (c) => { try { setPreview((await adminApi.previewChallenge(c.id)).challenge); } catch (err) { toast.error(err.message); } };

  return (
    <div className="page">
      <PageHeader title="Daily challenges" subtitle="Two questions per day. Schedule ahead. Students only see a challenge on its date."
        actions={<Button variant="primary" onClick={() => setEditing({})}><CalendarPlus size={16} />Schedule challenge</Button>} />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : data.items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">No challenges yet. Add questions to the bank, then schedule your first day.</div>
      ) : (
        <div className="space-y-3">{data.items.map((c) => (
          <div key={c.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="lg:w-44"><div className="font-bold text-white">{formatDate(c.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div className="mt-1 flex items-center gap-2"><StatusPill tone={statusTone[c.status]}>{c.status}</StatusPill><span className="text-xs text-slate-500">{c.completions} done</span></div></div>
            <div className="grid flex-1 gap-2 sm:grid-cols-2">{c.questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-700/40 px-3 py-2"><span className="truncate text-sm text-slate-100">{q.title}</span><DifficultyBadge level={q.difficulty} /></div>))}</div>
            <div className="flex gap-1 self-end lg:self-center">
              <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => openPreview(c)} aria-label="Preview"><Eye size={17} /></button>
              <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => togglePublish(c)} aria-label={c.published ? 'Unpublish' : 'Publish'}>{c.published ? <EyeOff size={17} /> : <Eye size={17} className="text-emerald-300" />}</button>
              <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => setEditing(c)} aria-label="Edit"><Pencil size={17} /></button>
              <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300" onClick={() => setDeleting(c)} aria-label="Delete"><Trash2 size={17} /></button>
            </div>
          </div>))}
          <Pagination pagination={data.pagination} onPage={setPage} /></div>)}
      {editing && <ChallengeForm initial={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview ? `Student preview · ${preview.date}` : ''}>
        {preview && <div className="grid gap-5 md:grid-cols-2">{preview.questions.map((q, i) => <ChallengeCard key={q.id} question={q} index={i} readOnly />)}</div>}
      </Modal>
      <ConfirmModal open={!!deleting} danger busy={busy} onClose={() => setDeleting(null)} onConfirm={del} title="Delete challenge?" confirmLabel="Delete" message="You can only unpublish challenges that have student completions." />
    </div>
  );
}
