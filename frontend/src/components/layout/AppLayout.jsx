import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, Power } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';
import { NAV_ITEMS } from './navConfig';
import Avatar from '../common/Avatar';
import RouteFallback from '../../routes/RouteFallback';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const items = NAV_ITEMS[user.role] || [];

  return (
    <div
      data-role={user.role}
      className="grid min-h-screen grid-rows-[auto_1fr] md:h-screen md:grid-cols-[16rem_1fr] md:grid-rows-1 md:overflow-hidden print:h-auto print:overflow-visible print:block"
    >
      <aside className="hidden flex-col overflow-y-auto border-r border-border bg-card p-4 md:flex print:hidden">
        <div className="relative -mx-4 -mt-4 mb-6 overflow-hidden rounded-b-2xl bg-gradient-to-b from-role-accent-soft to-transparent px-6 pb-5 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-soft">
              <GraduationCap className="h-4.5 w-4.5" size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-foreground">Intégration DUT1</p>
              <p className="text-xs text-muted-foreground">ESP Dakar</p>
            </div>
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
                  isActive ? 'bg-role-accent-soft text-role-accent' : 'text-muted-foreground hover:bg-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-role-accent" />}
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <Avatar name={user.fullName} ring />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden print:hidden">
        <div className="flex items-center gap-2">
          <Avatar name={user.fullName} size={32} ring />
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          onClick={logout}
          aria-label="Se déconnecter"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Power className="h-4.5 w-4.5" size={18} />
        </button>
      </header>

      <main className="overflow-y-auto bg-background pb-20 md:pb-0 print:overflow-visible print:pb-0">
        <div key={location.pathname} className="mx-auto max-w-5xl p-4 sm:p-6 animate-fade-in-up">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur md:hidden print:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-role-accent' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-all duration-150 ${
                    isActive ? 'scale-105 bg-role-accent-soft' : ''
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
