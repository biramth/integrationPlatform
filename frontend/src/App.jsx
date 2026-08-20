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
const MenuPage = lazy(() => import('./pages/cuisine/MenuPage'));
const RisksPage = lazy(() => import('./pages/sante/RisksPage'));
const HealthTrackingPage = lazy(() => import('./pages/sante/HealthTrackingPage'));
const AllergensAdminPage = lazy(() => import('./pages/sante/AllergensAdminPage'));

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<RoleRoute roles={['registrar', 'admin']} />}>
              <Route path="/registrar/basic" element={<BasicInfoFormPage />} />
              <Route path="/registrar/complementary" element={<CompleteInfoFormPage />} />
            </Route>

            <Route element={<RoleRoute roles={['logistics', 'admin']} />}>
              <Route path="/logistics" element={<LogisticsListPage />} />
              <Route path="/logistics/rooms" element={<RoomsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/records" element={<AdminRecordsPage />} />
              <Route path="/admin/rooms" element={<AdminRoomsPage />} />
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
              <Route path="/admin/activites" element={<ActivitiesPage />} />
              <Route path="/admin/print/rooms" element={<PrintRoomManifestPage />} />
            </Route>

            <Route element={<RoleRoute roles={['cuisine', 'admin']} />}>
              <Route path="/cuisine/menu" element={<MenuPage />} />
            </Route>

            <Route element={<RoleRoute roles={['sante', 'admin']} />}>
              <Route path="/sante/risques" element={<RisksPage />} />
              <Route path="/sante/suivi" element={<HealthTrackingPage />} />
              <Route path="/sante/allergenes" element={<AllergensAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App
