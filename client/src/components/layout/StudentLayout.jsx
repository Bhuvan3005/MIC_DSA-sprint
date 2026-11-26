import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, LogOut, PlayCircle, Search, ShieldCheck, Trophy, User } from 'lucide-react';
import Logo from '../common/Logo';
import { Avatar } from '../common/ui';
import { useAuth } from '../../context/AuthContext';
import { assetUrl, cn } from '../../utils/format';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/daily-challenges', label: 'Challenges', icon: CalendarCheck },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/videos', label: 'Videos', icon: PlayCircle },
  { to: '/profile', label: 'Profile', icon: User },
];

function TopBar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e) => { e.preventDefault(); if (q.trim()) nav(`/videos?q=${encodeURIComponent(q.trim())}`); };
  return (
    <div className="flex items-center gap-3 px-4 pt-5 sm:px-6 lg:px-8">
      <form onSubmit={submit} role="search" className="flex h-12 max-w-xl flex-1 items-center gap-3 rounded-2xl bg-ink-800 px-4 ring-1 ring-white/[0.06] focus-within:ring-white/20">
        <Search size={18} className="shrink-0 text-zinc-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search video solutions…" aria-label="Search video solutions"
          className="h-full w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none" />
      </form>
      <div className="ml-auto flex items-center gap-3">
        <Link to="/leaderboard" className="hidden h-12 items-center gap-2 rounded-2xl bg-ink-800 px-4 text-sm ring-1 ring-white/[0.06] transition-colors hover:ring-white/20 sm:flex">
          <Trophy size={16} className="text-mic-amber" /><span className="font-semibold tabular-nums text-white">{user?.totalPoints ?? 0}</span><span className="text-zinc-500">pts</span>
        </Link>
        <Link to="/profile" aria-label="Your profile" className="hidden lg:block"><Avatar name={user?.name} seed={user?.id} size={44} src={assetUrl(user?.avatarUrl)} /></Link>
      </div>
    </div>
  );
}

export default function StudentLayout() {
  const { user, logout, isStaff } = useAuth();
  const nav = useNavigate();
  const out = async () => { await logout(); nav('/login'); };

  return (
    <div className="app-bg min-h-screen lg:pl-64">
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-ink-950 py-6 lg:flex">
        <div className="px-6"><Logo to="/dashboard" /></div>

        <nav className="mt-9 space-y-1 px-3" aria-label="Main">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] transition-colors',
              isActive ? 'bg-gradient-to-r from-white/[0.10] to-white/[0.02] font-medium text-white ring-1 ring-white/[0.06]' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white')}>
              <Icon size={19} strokeWidth={1.6} />{label}
            </NavLink>
          ))}
          {isStaff && (
            <Link to="/admin" className="flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white">
              <ShieldCheck size={19} strokeWidth={1.6} />Admin panel
            </Link>
          )}
        </nav>

        <div className="mx-4 mt-auto flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
          <Avatar name={user?.name} seed={user?.id} size={36} src={assetUrl(user?.avatarUrl)} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{user?.name}</div><div className="truncate text-xs text-zinc-500">{user?.college || user?.role}</div></div>
          <button onClick={out} aria-label="Log out" className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Mobile: slim top bar + bottom tabs */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.07] bg-ink-900 px-4 lg:hidden">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-3">
          {isStaff && <Link to="/admin" className="text-xs font-medium text-zinc-400">Admin</Link>}
          <Link to="/profile" aria-label="Your profile"><Avatar name={user?.name} seed={user?.id} size={32} src={assetUrl(user?.avatarUrl)} /></Link>
        </div>
      </header>

      <main className="pb-24 lg:pb-8"><TopBar /><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.07] bg-ink-900 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors', isActive ? 'text-white' : 'text-zinc-500')}>
            <Icon size={20} strokeWidth={1.6} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
