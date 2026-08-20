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
const CompleteInfoFormPage = lazy(() => import('./pages/registrar/CompleteInfoFormPage'));
const LogisticsListPage = lazy(() => import('./pages/logistics/LogisticsListPage'));
const RoomsPage = lazy(() => import('./pages/logistics/RoomsPage'));
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
const DirectoryPage = lazy(() => import('./pages/communication/DirectoryPage'));
const PlanningReadOnlyPage = lazy(() => import('./pages/shared/PlanningReadOnlyPage'));

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

            <Route element={<RoleRoute roles={['orga', 'admin']} orgaScope="enregistrement" />}>
              <Route path="/orga/basic" element={<BasicInfoFormPage />} />
              <Route path="/orga/complementary" element={<CompleteInfoFormPage />} />
            </Route>

            <Route element={<RoleRoute roles={['orga', 'admin']} orgaScope="bagages" />}>
              <Route path="/orga/luggage" element={<LogisticsListPage />} />
            </Route>

            <Route element={<RoleRoute roles={['orga', 'admin']} orgaScope="chambres" />}>
              <Route path="/orga/rooms" element={<RoomsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/records" element={<AdminRecordsPage />} />
              <Route path="/admin/rooms" element={<AdminRoomsPage />} />
              <Route path="/admin/print/rooms" element={<PrintRoomManifestPage />} />
            </Route>

            <Route element={<RoleRoute roles={['admin']} allowLeads />}>
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['admin', 'activites']} />}>
              <Route path="/admin/activites" element={<ActivitiesPage />} />
            </Route>

            <Route element={<RoleRoute roles={['it']} />}>
              <Route path="/admin/plateforme" element={<PlatformResetPage />} />
            </Route>

            <Route element={<RoleRoute roles={['cuisine', 'admin']} />}>
              <Route path="/cuisine/menu" element={<MenuPage />} />
            </Route>

            <Route element={<RoleRoute roles={['sante', 'admin']} />}>
              <Route path="/sante/risques" element={<RisksPage />} />
              <Route path="/sante/suivi" element={<HealthTrackingPage />} />
              <Route path="/sante/allergenes" element={<AllergensAdminPage />} />
            </Route>

            <Route element={<RoleRoute roles={['communication']} />}>
              <Route path="/communication/annuaire" element={<DirectoryPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App
