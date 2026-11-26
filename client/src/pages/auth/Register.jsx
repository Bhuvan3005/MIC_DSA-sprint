import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Field, Spinner } from '../../components/common/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { COLLEGES } from '../../utils/format';

import Button from '../../components/common/Button';
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 1 + i);

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '', graduationYear: thisYear + 2, leetcodeUsername: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      await register({ ...form, graduationYear: Number(form.graduationYear), leetcodeUsername: form.leetcodeUsername.trim() });
      toast.success('Account created. Let’s start sprinting!');
      nav('/dashboard', { replace: true });
    } catch (err) {
      const fields = {};
      (err.details || []).forEach((d) => { fields[d.field] = d.message; });
      setErrors(Object.keys(fields).length ? fields : { form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join students across India solving DSA every day."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-brand-400 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name}><input className="input" required autoComplete="name" value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters with a letter and a number."><input className="input" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        <Field label="College" error={errors.college}>
          <select className="input" required value={form.college} onChange={set('college')}>
            <option value="" disabled>Select your college</option>
            {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Graduation year" error={errors.graduationYear}>
            <select className="input" value={form.graduationYear} onChange={set('graduationYear')}>{years.map((y) => <option key={y}>{y}</option>)}</select>
          </Field>
          <Field label="LeetCode username" error={errors.leetcodeUsername}><input className="input" required placeholder="e.g. neal_wu" value={form.leetcodeUsername} onChange={set('leetcodeUsername')} /></Field>
        </div>
        <p className="text-xs text-slate-500">Your solves are verified against your public LeetCode profile, so the username must be correct and your submissions public.</p>
        {errors.form && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">{errors.form}</p>}
        <Button variant="primary" className="w-full" disabled={busy}>{busy && <Spinner />}Create account</Button>
      </form>
    </AuthShell>
  );
}
