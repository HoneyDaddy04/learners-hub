import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { roleLabel } from '../lib/format';
import { useMember, useSession } from '../lib/session';

export function Layout() {
  const { logout } = useSession();
  const { member, org, isAdmin, isManager } = useMember();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'My learning', show: true },
    { to: '/library', label: 'Library', show: true },
    { to: '/team', label: 'Team', show: isManager },
    { to: '/build', label: 'Build a path', show: isManager },
    { to: '/people', label: 'People', show: isAdmin },
  ].filter((l) => l.show);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">LH</span>
            <span className="hidden sm:inline">{org.name}</span>
          </NavLink>
          <nav className="hidden flex-1 gap-1 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{member.name}</div>
              <div className="text-xs text-slate-500">{roleLabel[member.role]}</div>
            </div>
            <button className="btn-secondary" onClick={() => void logout()}>Sign out</button>
          </div>
          <button className="ml-auto rounded-lg p-2 text-slate-600 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>☰</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
            <button className="btn-secondary mt-2" onClick={() => void logout()}>Sign out ({member.name})</button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
