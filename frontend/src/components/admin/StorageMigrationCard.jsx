import { useState, useEffect } from 'react';
import { CloudUpload, HardDrive, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { getStorageStatus, migrateStorageToR2 } from '../../api/platformApi';
import { useToast } from '../../hooks/useToast';

export default function StorageMigrationCard() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [deleteSource, setDeleteSource] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    getStorageStatus()
      .then((data) => {
        if (isSubscribed) setStatus(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const data = await getStorageStatus();
      setStatus(data);
    } catch {
      // Ignorer si non disponible
    } finally {
      setLoading(false);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await migrateStorageToR2(deleteSource);
      setMigrationResult(res.stats);
      showToast('Transfert des photos vers Cloudflare R2 terminé !', 'success');
      fetchStatus();
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec du transfert vers Cloudflare R2.', 'error');
    } finally {
      setMigrating(false);
    }
  }

  return (
    <Card className="mb-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Stockage des photos de bagages (Cloudflare R2)</h3>
        </div>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading || migrating}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Pour éviter de saturer l'espace de stockage de Supabase, les photos de bagages peuvent être transférées
        vers Cloudflare R2 (10 Go gratuits, bande passante illimitée et gratuite).
      </p>

      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-lg text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Fournisseur actif</span>
            <span className="font-medium text-foreground">{status.activeProvider}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Photos en base</span>
            <span className="font-medium text-foreground">{status.totalPhotosInDb} photo(s)</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Statut R2</span>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                status.isR2Configured ? 'text-success' : 'text-warning'
              }`}
            >
              {status.isR2Configured ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Clés configurées
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" /> En attente des clés
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {status?.isR2Configured && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border">
          <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={deleteSource}
              onChange={(e) => setDeleteSource(e.target.checked)}
              className="mt-0.5 rounded"
              disabled={migrating}
            />
            <span>
              Supprimer les photos de Supabase Storage après copie réussie sur R2 (libère immédiatement l'espace).
            </span>
          </label>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              loading={migrating}
              disabled={migrating}
              onClick={handleMigrate}
              className="inline-flex items-center gap-2"
            >
              <CloudUpload className="h-4 w-4" />
              {migrating ? 'Transfert en cours...' : 'Transférer toutes les photos vers R2'}
            </Button>
          </div>
        </div>
      )}

      {migrationResult && (
        <div className="p-3 bg-success-soft rounded-lg text-sm text-success-soft-foreground border border-success">
          <p className="font-semibold">Résultat du transfert :</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
            <li>Total analysé : {migrationResult.total}</li>
            <li>Copiées vers Cloudflare R2 : {migrationResult.migrated}</li>
            <li>Déjà présentes sur R2 : {migrationResult.alreadyInR2}</li>
            {migrationResult.deletedFromSource > 0 && (
              <li>Supprimées de Supabase : {migrationResult.deletedFromSource}</li>
            )}
            {migrationResult.failed > 0 && (
              <li className="text-danger font-medium">Échecs : {migrationResult.failed}</li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
}
