import { useState } from 'react';
import { KeyRound, ShieldCheck, Check, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { changePassword } from '../api/authApi';
import { ROLE_LABELS, ROLE_COLORS } from '../utils/roles';

function PasswordRule({ met, children }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {met ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{children}</span>
    </li>
  );
}

export default function AccountPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const formValid = hasMinLength && hasLetter && hasDigit && passwordsMatch && currentPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formValid) return;
    setLoading(true);
    try {
      const { token } = await changePassword(currentPassword, newPassword);
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

  const roleColor = ROLE_COLORS[user.role] || '#6b7280';

  return (
    <div>
      <PageHeader
        eyebrow="Mon compte"
        title="Paramètres du compte"
        description="Gérer votre profil et votre mot de passe."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Carte profil */}
        <Card className="flex items-center gap-4 lg:w-80 lg:flex-col lg:items-center lg:text-center">
          <Avatar name={user.fullName} size={64} ring />
          <div className="lg:mt-2">
            <h2 className="text-lg font-semibold text-foreground">{user.fullName}</h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <span
              className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: roleColor }}
            >
              {ROLE_LABELS[user.role]}
            </span>
            {user.isCommissionLead && (
              <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Chef
              </span>
            )}
          </div>
        </Card>

        {/* Formulaire mot de passe */}
        <Card className="flex-1 lg:max-w-lg">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Changer le mot de passe</h3>
              <p className="text-xs text-muted-foreground">Votre session sera renouvelée après modification.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
            />

            <div>
              <Input
                label="Nouveau mot de passe"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {newPassword.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 pl-0.5">
                  <PasswordRule met={hasMinLength}>Minimum 8 caractères</PasswordRule>
                  <PasswordRule met={hasLetter}>Au moins une lettre</PasswordRule>
                  <PasswordRule met={hasDigit}>Au moins un chiffre</PasswordRule>
                </ul>
              )}
            </div>

            <div>
              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1.5 text-xs text-danger-soft-foreground">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={!formValid}
              className="w-full sm:w-auto"
            >
              <KeyRound className="mr-1.5 inline h-4 w-4" />
              Modifier le mot de passe
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
