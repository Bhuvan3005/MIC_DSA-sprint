import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Film, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { adminApi, uploadToCloudinary } from '../../services';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal, DifficultyBadge, ErrorState, Field, Modal, PageHeader, Pagination, Skeleton, Spinner } from '../../components/common/ui';
import { DataTable, QuestionPicker, StatusPill } from '../../components/admin/shared';
import VideoPlayer from '../../components/videos/VideoPlayer';
import { DIFFICULTIES, TOPICS, formatBytes, formatDuration, parseTimestamp } from '../../utils/format';

import Button from '../../components/common/Button';
/** Upload + metadata editor. Handles create, edit and replace-video flows. */
function VideoForm({ initial, cfg, onClose, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const [f, setF] = useState({
    title: initial?.title || '', description: initial?.description || '', difficulty: initial?.difficulty || '', topics: initial?.topics || [],
    published: initial?.published || false,
    chapters: (initial?.chapters || []).map((c) => ({ title: c.title, time: formatDuration(c.startSeconds) })),
  });
  const [question, setQuestion] = useState(initial ? { id: initial.questionId?._id || initial.questionId, title: initial.question?.title || initial.questionId?.title, difficulty: initial.question?.difficulty || initial.questionId?.difficulty } : null);
  const [file, setFile] = useState(null);
  const [upload, setUpload] = useState({ state: 'idle', pct: 0, error: '', asset: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allowed = cfg.allowedFormats;
  const pick = (e) => {
    const picked = e.target.files?.[0]; if (!picked) return;
    const ext = picked.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { setUpload({ state: 'error', pct: 0, error: `Unsupported format .${ext}. Allowed: ${allowed.join(', ')}` }); setFile(null); return; }
    if (picked.size > cfg.maxBytes) { setUpload({ state: 'error', pct: 0, error: `File is ${formatBytes(picked.size)}; the limit is ${cfg.maxMB} MB.` }); setFile(null); return; }
    setFile(picked); setUpload({ state: 'ready', pct: 0, error: '', asset: null });
  };

  const doUpload = async () => {
    setUpload((u) => ({ ...u, state: 'uploading', pct: 0, error: '' }));
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const { upload: sig } = await adminApi.videoSignature();
      const asset = await uploadToCloudinary(file, sig, { signal: ctrl.signal, onProgress: (pct) => setUpload((u) => ({ ...u, pct })) });
      setUpload({ state: 'done', pct: 100, error: '', asset });
      toast.success('Video uploaded to Cloudinary');
    } catch (err) { setUpload({ state: 'error', pct: 0, error: err.message }); }
  };

  const save = async () => {
    setError('');
    if (!f.title.trim()) return setError('Title is required');
    if (!question) return setError('Select the question this video solves');
    if (!initial && upload.state !== 'done') return setError('Upload a video file first');
    const chapters = [];
    for (const c of f.chapters.filter((x) => x.title.trim() || x.time.trim())) {
      const t = parseTimestamp(c.time);
      if (t == null || !c.title.trim()) return setError('Each chapter needs a title and a valid timestamp (e.g. 2:30)');
      chapters.push({ title: c.title.trim(), startSeconds: t });
    }
    const body = { title: f.title.trim(), description: f.description, difficulty: f.difficulty || undefined, topics: f.topics, chapters, published: f.published, questionId: question.id };
    if (upload.asset) Object.assign(body, { cloudinaryPublicId: upload.asset.public_id, secureUrl: upload.asset.secure_url, duration: upload.asset.duration, bytes: upload.asset.bytes, format: upload.asset.format });
    setBusy(true);
    try {
      if (initial) await adminApi.updateVideo(initial._id, body); else await adminApi.createVideo(body);
      toast.success(initial ? 'Video updated' : 'Video saved'); onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const setChapter = (i, k, v) => setF({ ...f, chapters: f.chapters.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });
  const toggleTopic = (t) => setF({ ...f, topics: f.topics.includes(t) ? f.topics.filter((x) => x !== t) : [...f.topics, t] });
  const close = () => { abortRef.current?.abort(); onClose(); };

  return (
    <Modal open onClose={close} wide title={initial ? 'Edit video solution' : 'Upload video solution'}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy || upload.state === 'uploading'}>{busy && <Spinner />}Save video</Button></>}>
      <div className="space-y-5">
        <div>
          <span className="label">{initial ? 'Replace video file (optional)' : 'Video file'}</span>
          <div className="rounded-xl border border-dashed border-ink-500 bg-ink-900/60 p-4">
            <input ref={fileRef} type="file" hidden accept={allowed.map((x) => `.${x}`).join(',')} onChange={pick} />
            {upload.state === 'idle' || upload.state === 'error' ? (
              <button type="button" className="flex w-full flex-col items-center gap-2 py-4 text-slate-400 hover:text-white" onClick={() => fileRef.current.click()}>
                <UploadCloud size={28} /><span className="text-sm font-medium">Choose a video</span><span className="text-xs">{allowed.join(', ').toUpperCase()} · max {cfg.maxMB} MB</span></button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Film size={18} className="text-brand-400" /><span className="min-w-0 flex-1 truncate text-white">{file?.name}</span><span className="text-slate-400">{formatBytes(file?.size)}</span>
                  {upload.state !== 'uploading' && <button type="button" onClick={() => { setFile(null); setUpload({ state: 'idle', pct: 0, error: '', asset: null }); }} aria-label="Remove" className="text-slate-500 hover:text-white"><X size={16} /></button>}</div>
                {upload.state === 'ready' && <Button type="button" variant="primary" className="w-full" onClick={doUpload}><UploadCloud size={16} />Upload to Cloudinary</Button>}
                {upload.state === 'uploading' && (<div><div className="mb-1 flex justify-between text-xs text-slate-400"><span>Uploading…</span><span>{upload.pct}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-600" role="progressbar" aria-valuenow={upload.pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${upload.pct}%` }} /></div>
                  <Button type="button" variant="ghost" className="mt-2 !py-1 text-xs" onClick={() => abortRef.current?.abort()}>Cancel upload</Button></div>)}
                {upload.state === 'done' && <p className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} />Uploaded · {formatDuration(upload.asset.duration)} · {formatBytes(upload.asset.bytes)}</p>}
              </div>)}
            {upload.error && <p className="mt-2 flex items-start gap-2 text-sm text-rose-300" role="alert"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{upload.error}</p>}
          </div>
        </div>
        <Field label="Question"><QuestionPicker value={question} onChange={setQuestion} /></Field>
        <Field label="Title"><input className="input" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Description"><textarea className="input min-h-[90px]" maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty" hint="Defaults to the question's difficulty."><select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="">From question</option>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-violet-500" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />Publish immediately</label>
        </div>
        <div><span className="label">Topics</span><div className="flex flex-wrap gap-2">{TOPICS.map((t) => (
          <button key={t} type="button" aria-pressed={f.topics.includes(t)} onClick={() => toggleTopic(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${f.topics.includes(t) ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-500 text-slate-400 hover:text-white'}`}>{t}</button>))}</div></div>
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="label !mb-0">Chapters / timestamps</span>
            <button type="button" className="text-xs font-semibold text-brand-400" onClick={() => setF({ ...f, chapters: [...f.chapters, { title: '', time: '' }] })}>+ Add chapter</button></div>
          <div className="space-y-2">{f.chapters.map((c, i) => (
            <div key={i} className="flex gap-2"><input className="input !w-24 font-mono" placeholder="0:00" value={c.time} onChange={(e) => setChapter(i, 'time', e.target.value)} aria-label="Timestamp" />
              <input className="input" placeholder="Chapter title" value={c.title} onChange={(e) => setChapter(i, 'title', e.target.value)} aria-label="Chapter title" />
              <button type="button" className="rounded-lg px-2 text-slate-500 hover:text-rose-300" onClick={() => setF({ ...f, chapters: f.chapters.filter((_, j) => j !== i) })} aria-label="Remove chapter"><X size={16} /></button></div>))}</div>
        </div>
        {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export default function Videos() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const cfg = useFetch(() => adminApi.videoConfig(), []);
  const { data, loading, error, reload } = useFetch(() => adminApi.videos({ page, limit: 10 }), [page]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const c = cfg.data?.config;

  const toggle = async (v) => { try { await adminApi.publishVideo(v._id, !v.published); toast.success(v.published ? 'Video unpublished' : 'Video published'); reload(); } catch (err) { toast.error(err.message); } };
  const del = async () => { setBusy(true); try { await adminApi.deleteVideo(deleting._id); toast.success('Video deleted'); setDeleting(null); reload(); } catch (err) { toast.error(err.message); setDeleting(null); } finally { setBusy(false); } };

  const cols = [
    { key: 'title', label: 'Video', render: (v) => (<div className="flex items-center gap-3"><div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-600">{v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />}</div>
      <div className="min-w-0"><div className="truncate font-semibold text-white">{v.title}</div><div className="text-xs text-slate-500">{v.question?.title} · {formatDuration(v.duration)}</div></div></div>) },
    { key: 'difficulty', label: 'Difficulty', render: (v) => v.difficulty && <DifficultyBadge level={v.difficulty} /> },
    { key: 'chapters', label: 'Chapters', render: (v) => v.chapters?.length || 0 },
    { key: 'published', label: 'Status', render: (v) => <StatusPill tone={v.published ? 'emerald' : 'amber'}>{v.published ? 'Published' : 'Draft'}</StatusPill> },
    { key: 'actions', label: '', className: 'text-right', render: (v) => (<div className="flex justify-end gap-1">
      <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => setPreview(v)} aria-label="Preview"><Film size={16} /></button>
      <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => toggle(v)} aria-label={v.published ? 'Unpublish' : 'Publish'}>{v.published ? <EyeOff size={16} /> : <Eye size={16} className="text-emerald-300" />}</button>
      <button className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-white" onClick={() => setEditing(v)} aria-label="Edit"><Pencil size={16} /></button>
      <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300" onClick={() => setDeleting(v)} aria-label="Delete"><Trash2 size={16} /></button></div>) },
  ];

  return (
    <div className="page">
      <PageHeader title="Video solutions" subtitle="Upload recorded explanations. Files go straight to Cloudinary using a signature issued by our server."
        actions={<Button variant="primary" disabled={!c} onClick={() => setEditing({})}><Plus size={16} />Upload video</Button>} />
      {c && !c.cloudinaryConfigured && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div><b>Cloudinary isn’t configured.</b> Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the server environment to enable uploads.</div></div>)}
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-64" /> : (<><DataTable columns={cols} rows={data.items} rowKey={(v) => v._id} empty="No videos uploaded yet." /><Pagination pagination={data.pagination} onPage={setPage} /></>)}
      {editing && c && <VideoForm initial={editing._id ? editing : null} cfg={c} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview?.title}>{preview && <VideoPlayer src={preview.secureUrl} poster={preview.thumbnailUrl} chapters={preview.chapters} />}</Modal>
      <ConfirmModal open={!!deleting} danger busy={busy} onClose={() => setDeleting(null)} onConfirm={del} title="Delete video?" confirmLabel="Delete" message="The video will be removed from Cloudinary and from the student library. This can’t be undone." />
    </div>
  );
}
