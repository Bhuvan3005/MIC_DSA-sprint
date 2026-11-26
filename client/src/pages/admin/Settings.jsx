import { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { adminApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ErrorState, Field, PageHeader, Skeleton, Spinner } from '../../components/common/ui';

import Button from '../../components/common/Button';
const rules = [
  ['firstQuestion', 'First daily question'], ['secondQuestion', 'Second daily question'], ['bothBonus', 'Completing all daily questions (bonus)'],
  ['streak7', '7-day streak milestone'], ['streak30', '30-day streak milestone'],
];

export default function Settings() {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => adminApi.settings(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setForm({ ...data.settings.scoring, dailyQuestionCount: data.settings.dailyQuestionCount }); }, [data]);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { dailyQuestionCount, ...scoring } = form;
      await adminApi.saveSettings({ scoring: Object.fromEntries(Object.entries(scoring).map(([k, v]) => [k, Number(v)])), dailyQuestionCount: Number(dailyQuestionCount) });
      toast.success('Settings saved. New rules apply to future completions only.'); reload();
    } catch (err) { toast.error(err.details?.[0]?.message || err.message); } finally { setBusy(false); }
  };

  return (
    <div className="page max-w-3xl">
      <PageHeader title="Settings" subtitle="Scoring rules and platform configuration." />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading || !form ? <Skeleton className="h-80" /> : (
        <form onSubmit={save} className="card space-y-5 p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold">Point rules</h2><p className="text-sm text-slate-400">Points are always computed on the server. Changing a rule never rewrites past awards.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">{rules.map(([k, label]) => (
            <Field key={k} label={label}><input className="input" type="number" min="0" max="10000" disabled={!isAdmin} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>))}</div>
          <Field label="Questions per daily challenge" hint="Challenges must contain exactly this many questions. Default is 2."><input className="input !w-32" type="number" min="1" max="5" disabled={!isAdmin} value={form.dailyQuestionCount} onChange={(e) => setForm({ ...form, dailyQuestionCount: e.target.value })} /></Field>
          {isAdmin ? <Button variant="primary" disabled={busy}>{busy && <Spinner />}Save settings</Button> : <p className="text-sm text-amber-300">Only administrators can change settings.</p>}
          <div className="border-t border-ink-500/60 pt-4 text-sm text-slate-400">Signed in as <b className="text-slate-200">{user.email}</b> ({user.role}). Platform timezone is configured on the server (PLATFORM_TIMEZONE, default Asia/Kolkata).</div>
        </form>)}
    </div>
  );
}
