import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';
import { NAV_ITEMS } from './navConfig';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const items = NAV_ITEMS[user.role] || [];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-slate-900">Intégration DUT1</p>
          <p className="text-xs text-slate-500">ESP Dakar</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="px-2 text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          <p className="mb-2 px-2 text-sm font-medium text-slate-900">{user.fullName}</p>
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
            Se déconnecter
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div>
          <p className="text-sm font-semibold text-slate-900">Intégration DUT1</p>
          <p className="text-xs text-slate-500">{user.fullName} · {ROLE_LABELS[user.role]}</p>
        </div>
        <button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-red-600">
          Quitter
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
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
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive ? 'text-blue-900' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
