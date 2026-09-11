import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, Power, Sun, Moon, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useFetch } from '../../hooks/useFetch';
import { getPlatformSettings } from '../../api/platformSettingsApi';
import { ROLE_LABELS } from '../../utils/roles';
import { getNavItems, getPrimaryNavItems, getGroupedNavItems } from './navConfig';
import Avatar from '../common/Avatar';
import RouteFallback from '../../routes/RouteFallback';

function SidebarLink({ item, onClick }) {
  return (
    <NavLink
      to={item.to}
      end
      onClick={onClick}
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
  );
}

// Au-delà de 4 pages, une liste plate devient longue à scanner (chef de pôle
// Orga, IT, chef Santé...) — les sections (cf. getGroupedNavItems) donnent des
// repères visuels. En dessous, la liste reste courte et un en-tête de section
// n'ajoute rien.
function NavSections({ items, onNavigate }) {
  if (items.length <= 4) {
    return (
      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map((item) => (
          <SidebarLink key={item.to} item={item} onClick={onNavigate} />
        ))}
      </nav>
    );
  }
  return (
    <nav className="flex flex-1 flex-col gap-3">
      {getGroupedNavItems(items).map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} onClick={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const settingsFetch = useFetch(getPlatformSettings, []);
  const items = getNavItems(user, settingsFetch.data);
  const primaryItems = getPrimaryNavItems(items);
  // "Plus" n'apparaît que si des pages restent en dehors de la barre basse —
  // en dessous de 5 pages, primaryItems === items et le tiroir est inutile.
  const hasMore = primaryItems.length < items.length;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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
        <NavSections items={items} />
        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <Avatar name={user.fullName} ring />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit'}
            title={theme === 'dark' ? 'Mode jour' : 'Mode nuit'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={user.fullName} size={32} ring />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" size={18} /> : <Moon className="h-4.5 w-4.5" size={18} />}
          </button>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Power className="h-4.5 w-4.5" size={18} />
          </button>
        </div>
      </header>

      <main className="overflow-y-auto bg-background pb-20 md:pb-0 print:overflow-visible print:pb-0">
        <div key={location.pathname} className="mx-auto max-w-5xl p-4 sm:p-6 animate-fade-in-up">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Barre de navigation basse (mobile) : les pages les plus utilisées en
          accès direct, "Plus" ouvre le tiroir groupé pour le reste — cf.
          getPrimaryNavItems/getGroupedNavItems dans navConfig.js. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
        aria-label="Navigation principale"
      >
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-role-accent' : 'text-muted-foreground'
              }`
            }
          >
            <item.icon className="h-5 w-5" strokeWidth={2} />
            <span className="truncate px-0.5">{item.shortLabel || item.label}</span>
          </NavLink>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            <span>Plus</span>
          </button>
        )}
      </nav>

      {hasMore && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden print:hidden ${
              menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl transition-transform duration-200 md:hidden print:hidden ${
              menuOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2.5">
              <p className="text-sm font-semibold text-foreground">Toutes les pages</p>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavSections items={items} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </>
      )}
    </div>
  );
}
