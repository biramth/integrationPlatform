import { useState } from 'react';
import { ShieldAlert, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { resetPlatform, RESET_CONFIRMATION_PHRASE } from '../../api/platformApi';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../hooks/useToast';

// Transmission de la plateforme à la génération IT suivante. Action irréversible :
// double confirmation (checkbox + phrase tapée à l'identique) avant l'appel réseau,
// et le backend revérifie can_reset_platform + la même phrase de son côté.
export default function PlatformResetPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ack, setAck] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  if (!user.canResetPlatform) {
    return (
      <div>
        <PageHeader title="Réinitialiser la plateforme" />
        <Card className="flex items-center gap-3 border-warning bg-warning-soft">
          <TriangleAlert className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-warning-soft-foreground">
            Ton compte IT n'est pas habilité à déclencher la réinitialisation. Seuls certains comptes IT désignés
            peuvent transmettre la plateforme à la génération suivante.
          </p>
        </Card>
      </div>
    );
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetPlatform(phrase);
      setDone(true);
      showToast('Plateforme réinitialisée pour la nouvelle génération.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Réinitialisation impossible.', 'error');
    } finally {
      setResetting(false);
    }
  }

  if (done) {
    return (
      <div>
        <PageHeader title="Réinitialiser la plateforme" />
        <Card className="border-success bg-success-soft">
          <p className="text-sm font-medium text-success-soft-foreground">
            La plateforme a été réinitialisée. Les dossiers DUT1, chambres, admis importés, repas et activités de
            cette édition ont été effacés. Les comptes agents et la liste des allergènes sont conservés.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Réinitialiser la plateforme" description="Transmission à la génération IT suivante." />

      <Card className="flex flex-col gap-4 border-danger">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-foreground">Cette action est irréversible.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Elle efface définitivement : les dossiers DUT1 (et bagages, allergies déclarées, restrictions santé,
              historique des chambres associés), la liste des admis importés, les chambres, les repas et les
              activités. Les comptes agents et la liste des allergènes de référence sont conservés.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
          <span className="text-foreground">
            Je comprends que cette action supprime définitivement les données de cette édition et ne peut pas être
            annulée.
          </span>
        </label>

        <Input
          label={`Tape exactement « ${RESET_CONFIRMATION_PHRASE} » pour confirmer`}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          disabled={!ack}
        />

        <div className="flex justify-end">
          <Button
            variant="danger"
            disabled={!ack || phrase !== RESET_CONFIRMATION_PHRASE}
            loading={resetting}
            onClick={handleReset}
          >
            Réinitialiser la plateforme
          </Button>
        </div>
      </Card>
    </div>
  );
}
