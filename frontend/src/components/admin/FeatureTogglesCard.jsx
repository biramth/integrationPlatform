import { useState } from 'react';
import { FilePlus2, ClipboardList } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useFetch } from '../../hooks/useFetch';
import { getPlatformSettings, updatePlatformSetting } from '../../api/platformSettingsApi';
import { useToast } from '../../hooks/useToast';
import { ErrorState } from '../common/StateViews';

const FEATURES = [
  {
    key: 'registration',
    label: 'Enregistrement des DUT1',
    description: 'Création de nouveaux dossiers (phase 1, commission Orga).',
    icon: FilePlus2,
  },
  {
    key: 'phase2',
    label: 'Phase 2 — complément de dossier',
    description: 'Complément de dossier par la commission Santé.',
    icon: ClipboardList,
  },
];

// Enregistrement et phase 2 n'ont d'utilité que le premier jour de
// l'intégration : une fois désactivés, la page correspondante disparaît du
// menu des agents concernés et l'API refuse l'action, même pour IT — pour
// empêcher toute altération des dossiers après la saisie initiale.
export default function FeatureTogglesCard() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(getPlatformSettings, []);
  const [togglingKey, setTogglingKey] = useState(null);

  async function toggle(key, enabled) {
    setTogglingKey(key);
    try {
      await updatePlatformSetting(key, enabled);
      showToast(enabled ? 'Fonctionnalité activée.' : 'Fonctionnalité désactivée.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Modification impossible.', 'error');
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <Card className="mb-6 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Fonctionnalités de la journée d'accueil</p>
        <p className="text-xs text-muted-foreground">
          Enregistrement et phase 2 ne servent que le premier jour — les désactiver les fait disparaître du menu des
          agents et bloque l'action côté serveur, pour éviter toute modification après coup.
        </p>
      </div>
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading &&
        !error &&
        FEATURES.map((f) => {
          const enabled = data?.[f.key] !== false;
          return (
            <div key={f.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <f.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              </div>
              <Button
                variant={enabled ? 'secondary' : 'primary'}
                className="shrink-0 px-3 py-1.5 text-xs"
                loading={togglingKey === f.key}
                onClick={() => toggle(f.key, !enabled)}
              >
                {enabled ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          );
        })}
    </Card>
  );
}
