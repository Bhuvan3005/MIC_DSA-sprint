import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Field, Spinner } from '../../components/common/ui';
import { authApi } from '../../services';
import { useToast } from '../../context/ToastContext';

import Button from '../../components/common/Button';
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await authApi.forgot({ email }); setSent(true); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a reset link." footer={<Link to="/login" className="font-semibold text-brand-400 hover:underline">Back to log in</Link>}>
      {sent ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">If an account exists for <b>{email}</b>, a reset link is on its way. It expires in 30 minutes.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          <Button variant="primary" className="w-full" disabled={busy}>{busy && <Spinner />}Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const token = params.get('token'); const email = params.get('email');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await authApi.reset({ token, email, password }); toast.success('Password updated. Please log in.'); nav('/login'); }
    catch (err) { setError(err.details?.[0]?.message || err.message); } finally { setBusy(false); }
  };
  if (!token || !email) return <AuthShell title="Invalid link"><p className="text-sm text-slate-400">This reset link is incomplete. <Link className="text-brand-400" to="/forgot-password">Request a new one</Link>.</p></AuthShell>;
  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 8 characters with a letter and a number."><input className="input" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
        <Button variant="primary" className="w-full" disabled={busy}>{busy && <Spinner />}Update password</Button>
      </form>
    </AuthShell>
  );
}
