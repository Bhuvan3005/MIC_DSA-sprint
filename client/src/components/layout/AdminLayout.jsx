import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, CalendarDays, Library, Video, Users, Trophy, BarChart3, Settings, LogOut, Menu, X, ArrowUpRight } from 'lucide-react';
import Logo from '../common/Logo';
import { Avatar } from '../common/ui';
import { useAuth } from '../../context/AuthContext';
import { assetUrl, cn } from '../../utils/format';

import Button from '../common/Button';
const links = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/challenges', label: 'Daily Challenges', icon: CalendarDays },
  { to: '/admin/questions', label: 'Question Bank', icon: Library },
  { to: '/admin/videos', label: 'Video Solutions', icon: Video },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo to="/admin" /></div>
      <div className="kicker mx-5 mb-3">
        {user?.role === 'ADMIN' ? 'Host panel' : 'Editor panel'}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Admin">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-white/[0.07] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white')}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-3">
        <Button to="/dashboard" variant="ghost" className="w-full justify-between"><span>Student view</span><ArrowUpRight size={15} /></Button>
        <div className="flex items-center gap-2 rounded-lg p-2">
          <Avatar name={user?.name} seed={user?.id} size={32} src={assetUrl(user?.avatarUrl)} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{user?.name}</div><div className="text-xs text-zinc-500">{user?.role}</div></div>
          <button onClick={async () => { await logout(); nav('/login'); }} aria-label="Log out" className="rounded-lg p-2 text-slate-400 hover:bg-ink-600 hover:text-rose-300"><LogOut size={16} /></button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-bg min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-ink-950 lg:block"><Sidebar /></aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-ink-900 px-4 lg:hidden">
        <Logo to="/admin" />
        <button className="btn-ghost !px-2.5" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fadeUp border-r border-white/10 bg-ink-950">
            <button className="absolute right-3 top-3 rounded-lg p-2 text-slate-400" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <main><Outlet /></main>
    </div>
  );
}
