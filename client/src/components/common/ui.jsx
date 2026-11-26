import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react';
import { cn, difficultyStyle, initials } from '../../utils/format';

import { Spinner } from './Spinner';
import Button from './Button';
export { Spinner };

export const Skeleton = ({ className }) => <div className={cn('skeleton', className)} aria-hidden="true" />;

export const SkeletonCards = ({ count = 3, className = 'h-36' }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={className} />)}
  </div>
);

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-zinc-500"><Icon size={26} strokeWidth={1.5} /></div>
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-slate-400">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-red-400/30 px-6 py-12 text-center" role="alert">
      <div className="text-red-300"><AlertTriangle size={26} strokeWidth={1.5} /></div>
      <h3 className="text-base font-semibold">Something went wrong</h3>
      <p className="max-w-sm text-sm text-slate-400">{error?.message || 'Please try again.'}</p>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export const DifficultyBadge = ({ level }) => (
  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', difficultyStyle[level])}>{level}</span>
);

export const TopicTags = ({ topics = [], max = 3 }) => (
  <div className="flex flex-wrap gap-1.5">
    {topics.slice(0, max).map((t) => (
      <span key={t} className="rounded-md bg-ink-600/70 px-2 py-0.5 text-xs text-slate-300">{t}</span>
    ))}
    {topics.length > max && <span className="rounded-md bg-ink-600/70 px-2 py-0.5 text-xs text-slate-400">+{topics.length - max}</span>}
  </div>
);

const palette = ['bg-[#2f6fb0]', 'bg-[#3f8f52]', 'bg-[#b4501f]', 'bg-[#8a5d00]', 'bg-[#546270]'];
export function Avatar({ name, seed = name, size = 36, className, src }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  const idx = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  if (src && !broken) {
    return <img src={src} alt="" width={size} height={size} onError={() => setBroken(true)} draggable={false}
      style={{ width: size, height: size }} className={cn('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-white', palette[idx], className)} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="kicker">{label}</span>
        {Icon && <Icon size={15} className="text-zinc-600" />}
      </div>
      <div className="mt-3 font-heading font-semibold text-4xl leading-none text-white">{value ?? '-'}</div>
      {hint && <div className="mt-2 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, footer, top }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body>: the page wrapper is animated, which would otherwise become the popup's containing block.
  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/75 p-0 sm:p-4', top ? 'sm:items-start sm:pt-3' : 'sm:items-center')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cn('card flex w-full animate-pop flex-col', top ? 'max-h-[92vh] sm:max-h-[calc(100dvh-1.5rem)]' : 'max-h-[92vh]', ' rounded-b-none border-white/10 bg-ink-800 sm:rounded-xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-ink-600 hover:text-white"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy && <Spinner />}{confirmLabel}</Button>
      </>}>
      <p className="text-sm text-slate-300">{message}</p>
    </Modal>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost !px-2.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span className="tabular-nums">Page {page} / {pages}</span>
        <button className="btn-ghost !px-2.5" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-400" role="alert">{error}</p>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-5 overflow-x-auto border-b border-white/10', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn('-mb-px whitespace-nowrap border-b px-0.5 pb-2.5 text-sm font-medium transition-colors',
            value === t.value ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-200')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
      <div>
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-500' : 'bg-ink-500')}>
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition', checked && 'translate-x-5')} />
    </button>
  );
}
