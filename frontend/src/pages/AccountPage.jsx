import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { changePassword } from '../api/authApi';

export default function AccountPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValid = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword);
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch) return;
    setLoading(true);
    try {
      const { token } = await changePassword(currentPassword, newPassword);
      // Le backend renvoie un nouveau token (token_version incrémenté) :
      // on le sauvegarde pour que les futures requêtes soient authentifiées.
      if (token) localStorage.setItem('token', token);
      showToast('Mot de passe modifié avec succès.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la modification.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Mon compte"
        title={user.fullName}
        description={`${user.username} — ${user.role}`}
      />
      <Card className="max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {newPassword && !passwordValid && (
            <p className="text-xs text-danger-soft-foreground">
              Minimum 8 caractères, au moins une lettre et un chiffre.
            </p>
          )}
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-danger-soft-foreground">
              Les mots de passe ne correspondent pas.
            </p>
          )}
          <div>
            <Button
              type="submit"
              loading={loading}
              disabled={!passwordValid || !passwordsMatch || !currentPassword}
            >
              <KeyRound className="mr-1.5 inline h-4 w-4" />
              Modifier le mot de passe
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
