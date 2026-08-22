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
const RoomDeliveryPage = lazy(() => import('./pages/logistics/RoomDeliveryPage'));
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
const SanteOverviewPage = lazy(() => import('./pages/sante/OverviewPage'));
const CompleteInfoFormPage = lazy(() => import('./pages/sante/CompleteInfoFormPage'));
const Phase2QuestionsPage = lazy(() => import('./pages/sante/Phase2QuestionsPage'));
const DirectoryPage = lazy(() => import('./pages/communication/DirectoryPage'));
const PlanningReadOnlyPage = lazy(() => import('./pages/shared/PlanningReadOnlyPage'));
const OverviewPage = lazy(() => import('./pages/shared/OverviewPage'));
const AuditPage = lazy(() => import('./pages/shared/AuditPage'));
const AdminAuditPage = lazy(() => import('./pages/admin/AuditPage'));

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

            {/* Risques du jour, en plus de Santé (/sante/risques, détail complet) :
                Orga, Présidentielle et Dreudj voient QUI est à risque aujourd'hui,
                jamais POURQUOI — le détail médical est retiré côté backend pour ces
                rôles (cf. NON_MEDICAL_RISK_ROLES dans healthController.js). Route
                séparée de /sante/risques (pas de subScope ici : ces commissions
                n'ont pas de sous-rôle "suivi"), même composant RisksPage.jsx. */}
            <Route element={<RoleRoute roles={['orga', 'presidentielle', 'dreudj']} />}>
              <Route path="/risques" element={<RisksPage />} />
            </Route>

            {/* Journal d'audit : ouvert à tout chef de commission (scopé à sa
                propre commission côté backend) et à IT via le bypass superuser
                de RoleRoute — IT utilise normalement la vue complète /admin/audit. */}
            <Route element={<RoleRoute roles={[]} allowLeads />}>
              <Route path="/audit" element={<AuditPage />} />
            </Route>

            <Route element={<RoleRoute roles={['orga']} subScope="enregistrement" />}>
              <Route path="/orga/basic" element={<BasicInfoFormPage />} />
            </Route>

            <Route element={<RoleRoute roles={['orga']} subScope="bagages" />}>
              <Route path="/orga/luggage" element={<LogisticsListPage />} />
            </Route>

            {/* Sous-rôle Orga "chambres" : livrer, dans la chambre déjà
                assignée à chaque DUT1, les bagages que l'agent "bagages" a
                photographiés, puis confirmer le dépôt — pas de configuration
                des chambres elles-mêmes (cf. route /orga/rooms plus bas). */}
            <Route element={<RoleRoute roles={['orga']} subScope="chambres" />}>
              <Route path="/orga/deliveries" element={<RoomDeliveryPage />} />
            </Route>

            {/* Configurer les chambres (créer/modifier/supprimer, matelas,
                import, fiches imprimables) est un travail de mise en place
                réservé au chef Orga — pas au sous-rôle "chambres" (dont le
                travail quotidien est de livrer les bagages, cf. route
                /orga/deliveries ci-dessus), et pas à IT (excludeIt), ni via un
                lien de nav ni via son bypass superuser habituel (le backend
                refuse déjà l'appel API). */}
            <Route element={<RoleRoute roles={['orga']} requireLead excludeIt />}>
              <Route path="/orga/rooms" element={<AdminRoomsPage />} />
              <Route path="/admin/print/rooms" element={<PrintRoomManifestPage />} />
            </Route>

            {/* Vue d'ensemble : réservée au chef de commission, pas à tout agent
                Orga — sans ça les mêmes chiffres se retrouvent affichés à tout
                le monde en plus des pages opérationnelles. */}
            <Route element={<RoleRoute roles={['orga']} requireLead />}>
              <Route path="/orga/apercu" element={<OverviewPage />} />
            </Route>

            {/* Pas de rôle "admin" séparé : ces pages sont accessibles via le
                bypass superuser de la commission IT dans RoleRoute. */}
            <Route element={<RoleRoute roles={['it']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/records" element={<AdminRecordsPage />} />
              <Route path="/admin/plateforme" element={<PlatformResetPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>

            <Route element={<RoleRoute roles={['it']} allowLeads />}>
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['presidentielle']} />}>
              <Route path="/presidentielle" element={<OverviewPage />} />
              <Route path="/presidentielle/annuaire" element={<DirectoryPage />} />
            </Route>

            {/* Fixer le programme des activités est le ressort exclusif de la
                commission Présidentielle — IT n'y a plus accès (excludeIt), ni
                via un lien de nav ni via son bypass superuser habituel ; le
                backend refuse déjà les créations/modifications/suppressions.
                IT garde une vue lecture seule du calendrier via /planning,
                comme toutes les commissions. */}
            <Route element={<RoleRoute roles={['presidentielle']} excludeIt />}>
              <Route path="/admin/activites" element={<ActivitiesPage />} />
            </Route>

            <Route element={<RoleRoute roles={['cuisine']} />}>
              <Route path="/cuisine/menu" element={<MenuPage />} />
            </Route>

            {/* Risques du jour / Suivi santé restent le travail quotidien du
                chef Santé aussi (leadBypassesScope), contrairement aux tâches
                de sous-rôle des autres commissions. Le référentiel des
                allergènes se gère désormais depuis /sante/questions-phase2,
                pas une page à part. */}
            <Route element={<RoleRoute roles={['sante']} subScope="suivi" leadBypassesScope />}>
              <Route path="/sante/risques" element={<RisksPage />} />
              <Route path="/sante/suivi" element={<HealthTrackingPage />} />
            </Route>

            {/* Phase 2 (complément de dossier) : transféré depuis Orga, ce sont des
                questions médicales (traitement, allergies). Le chef y garde accès
                (leadBypassesScope) pour pouvoir corriger un dossier déjà complété —
                un DUT1 ne dit pas toujours tout du premier coup. */}
            <Route element={<RoleRoute roles={['sante']} subScope="phase2" leadBypassesScope />}>
              <Route path="/sante/complementary" element={<CompleteInfoFormPage />} />
            </Route>

            {/* Vue d'ensemble : réservée au chef de commission — les graphiques et
                compteurs qui y vivent ne doivent pas être dupliqués ailleurs
                (risques du jour, suivi santé) pour tout agent Santé. */}
            <Route element={<RoleRoute roles={['sante']} requireLead />}>
              <Route path="/sante/apercu" element={<SanteOverviewPage />} />
              <Route path="/sante/questions-phase2" element={<Phase2QuestionsPage />} />
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
