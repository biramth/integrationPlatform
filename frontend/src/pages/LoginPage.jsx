import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, FilePlus2, Luggage, Stethoscope, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { staggerStyle } from '../utils/stagger';

const COMMISSIONS = [
  { icon: FilePlus2, label: 'Enregistrement' },
  { icon: Luggage, label: 'Commission Orga' },
  { icon: Stethoscope, label: 'Commission Santé' },
  { icon: UtensilsCrossed, label: 'Commission Cuisine' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={homePathForRole(user.role, user.subRole)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(username, password);
      navigate(homePathForRole(loggedInUser.role, loggedInUser.subRole), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <GraduationCap className="h-5 w-5" />
          </span>
          Intégration DUT1
        </div>

        <div className="relative">
          <h1 className="mb-3 text-3xl font-semibold leading-tight">
            La coordination de l'intégration,<br /> en un seul endroit.
          </h1>
          <p className="max-w-sm text-sm text-blue-100">
            Enregistrement des DUT1, logement, bagages et sécurité alimentaire —
            chaque commission a sa page, tout le monde travaille sur les mêmes données.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-2">
          {COMMISSIONS.map((c, i) => (
            <span
              key={c.label}
              className="animate-fade-in-up flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-50 transition-colors hover:bg-white/15"
              style={staggerStyle(i, 80)}
            >
              <c.icon className="h-3.5 w-3.5" strokeWidth={2} />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-800 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold text-foreground">Intégration DUT1</span>
          </div>

          <h2 className="mb-1 text-xl font-semibold text-foreground">Connexion</h2>
          <p className="mb-6 text-sm text-muted-foreground">ESP Dakar — Espace agents et commissions</p>

          <div className="flex flex-col gap-4">
            <Input
              label="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{error}</p>
            )}
            <Button type="submit" loading={submitting} className="w-full">
              Se connecter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
