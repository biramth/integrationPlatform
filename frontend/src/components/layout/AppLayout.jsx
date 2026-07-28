import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';
import { NAV_ITEMS } from './navConfig';
import Avatar from '../common/Avatar';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const items = NAV_ITEMS[user.role] || [];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-800 text-base text-white">🎓</span>
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
                  <span className="text-base">{item.icon}</span>
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
            ⏻
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Avatar name={user.fullName} size={32} />
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-red-600">
          Quitter
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50 pb-20 md:pb-0">
        <div key={location.pathname} className="mx-auto max-w-5xl p-4 sm:p-6 animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-900' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-9 items-center justify-center rounded-full text-lg leading-none transition-colors ${isActive ? 'bg-blue-100' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
