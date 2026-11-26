import Logo from '../../components/common/Logo';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-450/15 blur-3xl" />
      <div className="relative w-full max-w-md animate-fadeUp">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="text-sm text-slate-400">Your daily DSA journey starts here.</p>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}
