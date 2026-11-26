import { useEffect, useState } from 'react';
import { Award, CalendarCheck, Crosshair, Crown, Flame, Gem, Lock, ShieldCheck, Swords, Target, Trophy, X, Zap } from 'lucide-react';
import { Modal, Skeleton } from '../common/ui';
import { cn } from '../../utils/format';

const ICONS = { zap: Zap, flame: Flame, swords: Swords, crown: Crown, target: Target, 'calendar-check': CalendarCheck, trophy: Trophy, gem: Gem, crosshair: Crosshair, shield: ShieldCheck };
export const TIERS = {
  common: { label: 'Common', color: '#9fb0c3' },
  rare: { label: 'Rare', color: '#4c8dff' },
  epic: { label: 'Epic', color: '#e0ac2b' },
  legendary: { label: 'Legendary', color: '#e2662f' },
};
const UNIT = { completed: 'solved', streak: 'days', perfectDays: 'perfect days', points: 'pts' };
const isNew = (a) => a.unlocked && a.awardedAt && Date.now() - new Date(a.awardedAt).getTime() < 3 * 86400000;

/** Hexagonal medal. Locked ones are greyed with a padlock; epic and legendary glow. */
export function Medal({ tier = 'common', icon, locked, size = 48 }) {
  const t = TIERS[tier] || TIERS.common; const Icon = ICONS[icon] || Award;
  const glow = !locked && (tier === 'epic' || tier === 'legendary') ? `drop-shadow(0 0 ${tier === 'legendary' ? 12 : 8}px ${t.color}88)` : undefined;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size * 1.1, filter: glow }}>
      <svg viewBox="0 0 56 62" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon points="28,2 52,15.5 52,46.5 28,60 4,46.5 4,15.5" strokeWidth="2" strokeLinejoin="round"
          fill={locked ? 'rgba(255,255,255,0.04)' : `${t.color}26`} stroke={locked ? '#3a3e44' : t.color} />
        <polygon points="28,9 46,19.5 46,42.5 28,53 10,42.5 10,19.5" strokeWidth="1" strokeLinejoin="round" fill="none" stroke={locked ? '#2c2f34' : t.color} opacity={locked ? 1 : 0.4} />
      </svg>
      <div className="absolute inset-0 grid place-items-center" style={{ color: locked ? '#52565d' : t.color }}>
        {locked ? <Lock size={size * 0.32} strokeWidth={1.8} /> : <Icon size={size * 0.44} strokeWidth={1.8} />}
      </div>
    </div>
  );
}

function Progress({ a }) {
  const pct = a.target ? Math.min(100, Math.round((a.progress / a.target) * 100)) : 0;
  const t = TIERS[a.tier] || TIERS.common;
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: t.color }} /></div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500"><span className="tabular-nums">{a.progress.toLocaleString()} / {a.target.toLocaleString()} {UNIT[a.type] || ''}</span><span>+{a.xp} XP</span></div>
    </div>
  );
}

function Row({ a }) {
  const t = TIERS[a.tier] || TIERS.common;
  return (
    <li className="flex items-center gap-3 rounded-2xl p-2.5">
      <Medal tier={a.tier} icon={a.icon} locked={!a.unlocked} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className={cn('truncate text-sm font-semibold', a.unlocked ? 'text-white' : 'text-zinc-400')}>{a.name}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: t.color, background: `${t.color}1f` }}>{t.label}</span></div>
        <div className="mb-1.5 truncate text-xs text-zinc-500">{a.description}</div>
        {a.unlocked ? <div className="text-[11px] text-emerald-400">Unlocked · +{a.xp} XP</div> : <Progress a={a} />}
      </div>
    </li>
  );
}

/** Dashboard panel: score, what to chase next, and everything already earned. */
export default function AchievementsPanel({ data, loading }) {
  const [all, setAll] = useState(false);
  if (loading && !data) return <section className="card rounded-[28px] p-6"><Skeleton className="h-72" /></section>;
  if (!data) return null;
  const items = data.items || [];
  const got = items.filter((a) => a.unlocked).sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt));
  const next = items.filter((a) => !a.unlocked).sort((a, b) => b.progress / (b.target || 1) - a.progress / (a.target || 1)).slice(0, 3);
  const pct = data.total ? Math.round((data.unlocked / data.total) * 100) : 0;

  return (
    <section className="card rounded-[28px] p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white"><Trophy size={17} className="text-mic-amber" />Achievements</h3>
        <span className="text-sm tabular-nums text-zinc-400">{data.unlocked}<span className="text-zinc-600">/{data.total}</span></span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-mic-amber to-mic-orange transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        <span className="text-xs font-semibold tabular-nums text-mic-amber">{data.xp} XP</span>
      </div>

      {got.length > 0 ? (
        <div className="mt-6">
          <div className="mb-3 text-xs text-zinc-500">Unlocked</div>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
            {got.slice(0, 8).map((a) => (
              <li key={a.key} className="group relative flex justify-center" title={`${a.name}: ${a.description}`}>
                <div className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105"><Medal tier={a.tier} icon={a.icon} size={52} /></div>
                {isNew(a) && <span className="absolute -right-0.5 -top-1 rounded-full bg-mic-orange px-1.5 text-[9px] font-bold uppercase text-white">New</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-white/[0.04] p-4 text-sm text-zinc-400">Nothing unlocked yet. Solve your first problem to earn <b className="text-white">First Blood</b>.</p>
      )}

      {next.length > 0 && (
        <div className="mt-6">
          <div className="mb-1 text-xs text-zinc-500">Next up</div>
          <ul className="-mx-2.5">{next.map((a) => <Row key={a.key} a={a} />)}</ul>
        </div>
      )}

      <button onClick={() => setAll(true)} className="mt-3 w-full rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white">View all achievements</button>

      <Modal open={all} onClose={() => setAll(false)} wide title={`Achievements · ${data.unlocked} of ${data.total} unlocked`}>
        {['legendary', 'epic', 'rare', 'common'].map((tier) => {
          const list = items.filter((a) => a.tier === tier);
          if (!list.length) return null;
          return (
            <div key={tier} className="mb-5 last:mb-0">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: TIERS[tier].color }}>{TIERS[tier].label}</div>
              <ul className="grid gap-1 sm:grid-cols-2">{list.map((a) => <Row key={a.key} a={a} />)}</ul>
            </div>
          );
        })}
      </Modal>
    </section>
  );
}

/** Game-style "Achievement unlocked" cards shown right after a solve. Each dismisses itself. */
export function UnlockPopups({ items, onClear }) {
  useEffect(() => {
    if (!items.length) return undefined;
    const t = setTimeout(onClear, 7000);
    return () => clearTimeout(t);
  }, [items, onClear]);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[120] flex flex-col items-center gap-3 px-4" role="status" aria-live="polite">
      {items.map((b) => {
        const t = TIERS[b.tier] || TIERS.common;
        return (
          <div key={b.key} className="unlock-shine pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-4 rounded-3xl border bg-ink-800 p-4 shadow-2xl"
            style={{ borderColor: `${t.color}66`, boxShadow: `0 20px 60px -20px ${t.color}66` }}>
            <Medal tier={b.tier} icon={b.icon} size={60} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: t.color }}>Achievement unlocked</div>
              <div className="mt-0.5 truncate text-lg font-semibold text-white">{b.name}</div>
              <div className="truncate text-xs text-zinc-400">{b.description}</div>
              <div className="mt-1 text-xs font-semibold text-mic-amber">+{b.xp} XP · {t.label}</div>
            </div>
            <button onClick={onClear} aria-label="Dismiss" className="self-start rounded-lg p-1 text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}
