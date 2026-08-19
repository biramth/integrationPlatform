import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomeRedirect from './pages/HomeRedirect';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import AppLayout from './components/layout/AppLayout';
import BasicInfoFormPage from './pages/registrar/BasicInfoFormPage';
import CompleteInfoFormPage from './pages/registrar/CompleteInfoFormPage';
import LogisticsListPage from './pages/logistics/LogisticsListPage';
import RoomsPage from './pages/logistics/RoomsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminRecordsPage from './pages/admin/AdminRecordsPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminAgentsPage from './pages/admin/AdminAgentsPage';
import ActivitiesPage from './pages/admin/ActivitiesPage';
import PrintRoomManifestPage from './pages/admin/PrintRoomManifestPage';
import PrintLuggageManifestPage from './pages/admin/PrintLuggageManifestPage';
import MenuPage from './pages/cuisine/MenuPage';
import RisksPage from './pages/sante/RisksPage';
import HealthTrackingPage from './pages/sante/HealthTrackingPage';
import AllergensAdminPage from './pages/sante/AllergensAdminPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />

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
            <Route path="/admin/print/luggage" element={<PrintLuggageManifestPage />} />
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
  );
}

export default App
