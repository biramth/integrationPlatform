import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(username, password);
      navigate(homePathForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Intégration DUT1</h1>
        <p className="mb-6 text-sm text-slate-500">ESP Dakar — Connexion agent</p>

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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </div>
      </form>
    </div>
  );
}
