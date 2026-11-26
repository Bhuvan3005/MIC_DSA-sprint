import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, CalendarDays, Camera, ExternalLink, Flame, GraduationCap, Hash, Pencil, Target, Trash2, Trophy } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { authApi, userApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, ErrorState, Field, Modal, PageHeader, Skeleton, Spinner, StatCard } from '../../components/common/ui';
import Heatmap from '../../components/dashboard/Heatmap';
import { COLLEGES, assetUrl } from '../../utils/format';

import Button from '../../components/common/Button';

/** Centre-crops any image to a 256px square JPEG data URL (about 15-30 KB), so uploads stay tiny. */
function squareJpeg(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('That image is too large. Choose one under 8 MB.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height); const out = 256;
      const canvas = document.createElement('canvas'); canvas.width = out; canvas.height = out;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out, out);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
}

function PhotoPicker({ name, seed, current, photo, removed, onPick, onRemove, onError }) {
  const input = useRef(null);
  const shown = photo || (removed ? null : assetUrl(current));
  const choose = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try { onPick(await squareJpeg(file)); } catch (err) { onError(err.message); }
  };
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} aria-label="Change profile picture" className="group relative shrink-0 rounded-full">
        <Avatar name={name} seed={seed} size={88} src={shown} />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Camera size={22} /></span>
      </button>
      <div>
        <div className="text-sm font-medium text-white">Profile picture</div>
        <p className="mt-0.5 text-xs text-zinc-500">PNG, JPG or WebP. It is cropped to a square.</p>
        <div className="mt-2.5 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>{shown ? 'Change photo' : 'Upload photo'}</Button>
          {shown && <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-zinc-400 transition-colors hover:text-red-300"><Trash2 size={13} />Remove</button>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={choose} />
    </div>
  );
}

function EditProfile({ open, onClose }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, college: user.college || '', graduationYear: user.graduationYear || '', leetcodeUsername: user.leetcodeUsername || '', bio: user.bio || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  const [photo, setPhoto] = useState(null);
  const [removed, setRemoved] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true); setErrs({});
    try {
      let r = await userApi.update({ ...f, graduationYear: Number(f.graduationYear) });
      // Picture changes go after the profile save, so the final user object carries the new picture URL.
      if (photo) r = await userApi.setAvatar(photo);
      else if (removed && user.avatarUrl) r = await userApi.removeAvatar();
      setUser(r.user); toast.success('Profile updated'); onClose();
    } catch (err) {
      const m = {}; (err.details || []).forEach((d) => { m[d.field] = d.message; });
      setErrs(Object.keys(m).length ? m : { form: err.message });
    } finally { setBusy(false); }
  };
  const changePw = async () => {
    try { await authApi.changePassword(pw); toast.success('Password changed'); setPw({ currentPassword: '', newPassword: '' }); }
    catch (err) { toast.error(err.details?.[0]?.message || err.message); }
  };

  return (
    <Modal open={open} onClose={onClose} top title="Edit profile" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>{busy && <Spinner />}Save changes</Button></>}>
      <div className="space-y-4">
        <PhotoPicker name={f.name} seed={user.id} current={user.avatarUrl} photo={photo} removed={removed}
          onPick={(d) => { setPhoto(d); setRemoved(false); }} onRemove={() => { setPhoto(null); setRemoved(true); }} onError={(m) => setErrs({ form: m })} />
        <Field label="Name" error={errs.name}><input className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="College" error={errs.college}><select className="input" value={f.college} onChange={set('college')}>{COLLEGES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Graduation year" error={errs.graduationYear}><input className="input" type="number" value={f.graduationYear} onChange={set('graduationYear')} /></Field>
          <Field label="LeetCode username" error={errs.leetcodeUsername} hint="Required. Solves are verified against this public profile."><input className="input" required value={f.leetcodeUsername} onChange={set('leetcodeUsername')} /></Field>
        </div>
        <Field label="Bio" error={errs.bio}><textarea className="input min-h-[80px]" maxLength={280} value={f.bio} onChange={set('bio')} /></Field>
        {errs.form && <p className="text-sm text-rose-300" role="alert">{errs.form}</p>}
        <div className="border-t border-ink-500/60 pt-4">
          <div className="label">Change password</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" type="password" placeholder="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <input className="input" type="password" placeholder="New password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
          <Button variant="ghost" className="mt-3" onClick={changePw} disabled={!pw.currentPassword || !pw.newPassword}>Update password</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const targetId = id || user.id;
  const own = targetId === user.id;
  const [editing, setEditing] = useState(false);
  const { data, loading, error, reload } = useFetch(() => userApi.profile(targetId), [targetId, user.totalPoints, user.name, user.college, user.avatarUrl]);

  if (error) return <div className="page"><ErrorState error={error.status === 404 ? { message: 'This student could not be found.' } : error} onRetry={reload} /></div>;
  if (loading && !data) return <div className="page space-y-4"><Skeleton className="h-40" /><Skeleton className="h-48" /></div>;
  const p = data.profile; const b = p.completedByDifficulty || {};

  return (
    <div className="page space-y-6">
      <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={p.name} seed={p.id} size={84} src={assetUrl(p.avatarUrl)} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            {p.college && <span className="inline-flex items-center gap-1.5"><GraduationCap size={15} />{p.college}{p.graduationYear ? ` · Class of ${p.graduationYear}` : ''}</span>}
            {p.leetcodeUsername && <a href={p.leetcodeProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-400 hover:underline">@{p.leetcodeUsername}<ExternalLink size={13} /></a>}
          </div>
          {p.bio && <p className="mt-2 text-sm text-slate-300">{p.bio}</p>}
        </div>
        {own && <Button variant="ghost" className="self-start" onClick={() => setEditing(true)}><Pencil size={15} />Edit profile</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard icon={Hash} tone="rose" label="Rank" value={p.rank ? `#${p.rank}` : '-'} />
        <StatCard icon={Trophy} label="Points" value={p.totalPoints} />
        <StatCard icon={Target} tone="emerald" label="Completed" value={p.totalCompleted} />
        <StatCard icon={Flame} tone="amber" label="Current streak" value={`${p.streak.current}d`} />
        <StatCard icon={Flame} tone="sky" label="Longest streak" value={`${p.streak.longest}d`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays size={18} className="text-brand-400" />Activity</h2>
            <span className="text-xs text-slate-400">{p.streak.activeDays} active days · {p.streak.monthlyActiveDays} this month</span></div>
          <Heatmap data={p.heatmap} />
        </section>
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold">Difficulty breakdown</h2>
          <p className="mb-4 text-xs text-slate-500">Counted from solves verified on LeetCode through CodeSprint daily challenges.</p>
          {['Easy', 'Medium', 'Hard'].map((d) => {
            const n = b[d] || 0; const pct = p.totalCompleted ? (n / p.totalCompleted) * 100 : 0;
            const color = d === 'Easy' ? 'bg-emerald-400' : d === 'Medium' ? 'bg-amber-400' : 'bg-rose-400';
            return <div key={d} className="mb-3"><div className="mb-1 flex justify-between text-sm"><span className="text-slate-300">{d}</span><span className="font-semibold text-white">{n}</span></div><div className="h-2 rounded-full bg-ink-600"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div></div>;
          })}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Award size={18} className="text-brand-400" />Achievements</h2>
        {p.badges.length === 0 ? <p className="text-sm text-slate-400">No achievements yet.{own && <> Head to <Link to="/daily-challenges" className="text-brand-400">today’s challenges</Link>.</>}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{p.badges.map((bd) => (
            <div key={bd.key} className="rounded-xl border border-ink-500/50 bg-white/[0.03] p-3"><div className="font-semibold text-white">{bd.name}</div><div className="text-xs text-slate-400">{bd.description}</div></div>))}</div>)}
      </section>
      {own && editing && <EditProfile open onClose={() => setEditing(false)} />}
    </div>
  );
}
