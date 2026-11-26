import { useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import logo from '../../assets/mic.webp';
import LookAtMeGrid from '../../components/originkit/ui/look-at-me-grid';

const input = 'h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-[15px] text-white placeholder:text-zinc-500 '
  + 'transition-colors hover:border-white/25 focus:border-[#4c8dff] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4c8dff]/20 focus-visible:ring-offset-0';

// Cool blue-grey on black: a quiet texture that lights up near the cursor.
const GRID_COLORS = { cursor: '#ffffff', center: '#4c8dff', bright: '#cfe0ff', innerHalo: '#4c6a9a', outerHalo: '#3a4658', far: '#2a3340' };

// Hide the component's drawn dot-and-ring cursor; the normal system cursor stays.
const NO_CURSOR = { cursorOpacity: 0 };

/** Fixed, behind everything, very low opacity. Pointer events pass through the page shells to the canvas. */
function GridBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden opacity-[0.45]" aria-hidden="true">
      <LookAtMeGrid background="transparent" glyph="+" colors={GRID_COLORS} size={12} speed={40} cursorStyle="native" advanced={NO_CURSOR} />
    </div>
  );
}

const POINTS = [
  ['bg-mic-orange', 'A fresh pair of LeetCode problems every day'],
  ['bg-mic-amber', 'Points, streaks and badges that reward consistency'],
  ['bg-mic-green', 'Video walkthroughs with chapters'],
  ['bg-mic-blue', 'College-wise and global leaderboards'],
];

function BrandPanel() {
  return (
    <aside className="pointer-events-none relative hidden flex-col justify-between p-12 lg:flex xl:p-16">
      <img src={logo} alt="MIC" className="h-16 w-auto self-start rounded-2xl bg-white p-2.5" />

      <div className="max-w-md">
        <h2 className="font-display text-[44px] leading-[1.08] tracking-tight text-white xl:text-5xl">
          Two problems a day.<br />One steady habit.
        </h2>
        <p className="mt-5 font-body text-[15px] leading-relaxed text-zinc-400">
          Solve the daily pair on LeetCode, keep your streak alive and climb the leaderboards.
        </p>
        <ul className="mt-9 space-y-3.5">
          {POINTS.map(([dot, text]) => (
            <li key={text} className="flex items-center gap-3 text-sm text-zinc-300">
              <span className={`h-2 w-2 shrink-0 rounded-[3px] ${dot}`} />{text}
            </li>
          ))}
        </ul>
      </div>

      <p className="font-body text-xs text-zinc-500">Built for college students across India.</p>
    </aside>
  );
}

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errId = useId();

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (error) setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = loc.state?.from;
      nav(from && (user.role !== 'STUDENT' || !from.startsWith('/admin')) ? from : user.role === 'STUDENT' ? '/dashboard' : '/admin', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="relative isolate min-h-screen bg-black font-body text-white lg:grid lg:grid-cols-[5fr_6fr]">
      <GridBackground />
      <BrandPanel />

      <main className="pointer-events-none flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:min-h-0">
        <div className="pointer-events-auto w-full max-w-[400px] animate-fadeUp">
          <img src={logo} alt="MIC" className="mb-10 h-12 w-auto rounded-xl bg-white p-2 lg:hidden" />

          <h1 className="font-display text-4xl leading-tight text-white">Welcome back</h1>
          <p className="mt-2 text-[15px] text-zinc-400">Log in to continue your streak.</p>

          <form onSubmit={submit} noValidate className="mt-9 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-200">Email</label>
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoFocus required
                className={input} placeholder="you@college.edu" value={form.email} onChange={set('email')}
                aria-invalid={!!error} aria-describedby={error ? errId : undefined} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-200">Password</label>
                <Link to="/forgot-password" className="text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-white hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required
                  className={`${input} pr-11`} placeholder="Enter your password" value={form.password} onChange={set('password')}
                  aria-invalid={!!error} aria-describedby={error ? errId : undefined} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-zinc-500 transition-colors hover:text-white focus-visible:text-white focus-visible:ring-4 focus-visible:ring-[#4c8dff]/20 focus-visible:ring-offset-0">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div id={errId} aria-live="polite">
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
                </p>
              )}
            </div>

            <button disabled={busy}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2f6fb0] text-[15px] font-semibold text-white transition-colors hover:bg-[#3a7cc3] focus-visible:ring-4 focus-visible:ring-[#4c8dff]/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? <><Loader2 size={17} className="animate-spin" />Logging in…</> : <>Log in<ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-400">
            New to CodeSprint?{' '}
            <Link to="/register" className="font-semibold text-[#7fb0e6] underline-offset-4 hover:underline">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
