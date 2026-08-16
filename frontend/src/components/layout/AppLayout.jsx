import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, Power } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';
import { NAV_ITEMS } from './navConfig';
import Avatar from '../common/Avatar';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const items = NAV_ITEMS[user.role] || [];

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] md:grid-cols-[16rem_1fr] md:grid-rows-1">
      <aside className="hidden flex-col border-r border-slate-200 bg-white p-4 md:flex print:hidden">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-800 text-white">
            <GraduationCap className="h-4.5 w-4.5" size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">Intégration DUT1</p>
            <p className="text-xs text-slate-500">ESP Dakar</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-blue-800" />}
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-slate-200 pt-3">
          <Avatar name={user.fullName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden print:hidden">
        <div className="flex items-center gap-2">
          <Avatar name={user.fullName} size={32} />
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          onClick={logout}
          aria-label="Se déconnecter"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Power className="h-4.5 w-4.5" size={18} />
        </button>
      </header>

      <main className="overflow-y-auto bg-slate-50 pb-20 md:pb-0">
        <div key={location.pathname} className="mx-auto max-w-5xl p-4 sm:p-6 animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden print:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-900' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-all duration-150 ${
                    isActive ? 'scale-105 bg-blue-100' : ''
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" size={18} strokeWidth={2} />
                </span>
                <span className="max-w-[4.5rem] truncate">{item.shortLabel || item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
