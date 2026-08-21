import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomeRedirect from './pages/HomeRedirect';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import AppLayout from './components/layout/AppLayout';
import RouteFallback from './routes/RouteFallback';

// Pages chargées à la demande : chacune part dans son propre chunk, ce qui sort
// du bundle initial les dépendances lourdes (recharts sur le tableau de bord,
// la capture photo sur la logistique…).
const BasicInfoFormPage = lazy(() => import('./pages/registrar/BasicInfoFormPage'));
const LogisticsListPage = lazy(() => import('./pages/logistics/LogisticsListPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminRecordsPage = lazy(() => import('./pages/admin/AdminRecordsPage'));
const AdminRoomsPage = lazy(() => import('./pages/admin/AdminRoomsPage'));
const AdminAgentsPage = lazy(() => import('./pages/admin/AdminAgentsPage'));
const ActivitiesPage = lazy(() => import('./pages/admin/ActivitiesPage'));
const PrintRoomManifestPage = lazy(() => import('./pages/admin/PrintRoomManifestPage'));
const PlatformResetPage = lazy(() => import('./pages/admin/PlatformResetPage'));
const MenuPage = lazy(() => import('./pages/cuisine/MenuPage'));
const RisksPage = lazy(() => import('./pages/sante/RisksPage'));
const HealthTrackingPage = lazy(() => import('./pages/sante/HealthTrackingPage'));
const AllergensAdminPage = lazy(() => import('./pages/sante/AllergensAdminPage'));
const SanteOverviewPage = lazy(() => import('./pages/sante/OverviewPage'));
const CompleteInfoFormPage = lazy(() => import('./pages/sante/CompleteInfoFormPage'));
const DirectoryPage = lazy(() => import('./pages/communication/DirectoryPage'));
const PlanningReadOnlyPage = lazy(() => import('./pages/shared/PlanningReadOnlyPage'));
const OverviewPage = lazy(() => import('./pages/shared/OverviewPage'));

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Planning : accessible à toutes les commissions, aucune restriction de rôle. */}
            <Route path="/planning" element={<PlanningReadOnlyPage />} />

            <Route element={<RoleRoute roles={['orga']} subScope="enregistrement" />}>
              <Route path="/orga/basic" element={<BasicInfoFormPage />} />
            </Route>

            <Route element={<RoleRoute roles={['orga']} subScope="bagages" />}>
              <Route path="/orga/luggage" element={<LogisticsListPage />} />
            </Route>

            {/* Chambres : gérées par la commission Orga (sous-domaine chambres) au
                quotidien, et par IT via le bypass superuser de RoleRoute — même
                page pour les deux, montée sur les deux chemins. */}
            <Route element={<RoleRoute roles={['orga']} subScope="chambres" />}>
              <Route path="/orga/rooms" element={<AdminRoomsPage />} />
            </Route>

            {/* Vue d'ensemble : pas de restriction de sous-domaine, c'est la vue
                globale du chef de commission sur les trois sphères d'Orga. */}
            <Route element={<RoleRoute roles={['orga']} />}>
              <Route path="/orga/apercu" element={<OverviewPage />} />
            </Route>

            {/* Pas de rôle "admin" séparé : ces pages sont accessibles via le
                bypass superuser de la commission IT dans RoleRoute. */}
            <Route element={<RoleRoute roles={['it']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/records" element={<AdminRecordsPage />} />
              <Route path="/admin/rooms" element={<AdminRoomsPage />} />
              <Route path="/admin/print/rooms" element={<PrintRoomManifestPage />} />
              <Route path="/admin/plateforme" element={<PlatformResetPage />} />
            </Route>

            <Route element={<RoleRoute roles={['it']} allowLeads />}>
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['presidentielle']} />}>
              <Route path="/presidentielle" element={<OverviewPage />} />
              <Route path="/presidentielle/annuaire" element={<DirectoryPage />} />
              <Route path="/admin/activites" element={<ActivitiesPage />} />
            </Route>

            <Route element={<RoleRoute roles={['cuisine']} />}>
              <Route path="/cuisine/menu" element={<MenuPage />} />
            </Route>

            <Route element={<RoleRoute roles={['sante']} subScope="suivi" />}>
              <Route path="/sante/risques" element={<RisksPage />} />
              <Route path="/sante/suivi" element={<HealthTrackingPage />} />
              <Route path="/sante/allergenes" element={<AllergensAdminPage />} />
            </Route>

            {/* Phase 2 (complément de dossier) : transféré depuis Orga, ce sont des
                questions médicales (traitement, allergies, admission). */}
            <Route element={<RoleRoute roles={['sante']} subScope="phase2" />}>
              <Route path="/sante/complementary" element={<CompleteInfoFormPage />} />
            </Route>

            {/* Vue d'ensemble : pas de restriction de sous-domaine, vue globale du
                chef de commission sur suivi + phase2. */}
            <Route element={<RoleRoute roles={['sante']} />}>
              <Route path="/sante/apercu" element={<SanteOverviewPage />} />
            </Route>

            <Route element={<RoleRoute roles={['communication']} />}>
              <Route path="/communication/annuaire" element={<DirectoryPage />} />
              <Route path="/communication/apercu" element={<OverviewPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App
