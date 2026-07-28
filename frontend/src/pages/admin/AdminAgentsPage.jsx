import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as agentApi from '../../api/agentApi';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { ROLE_LABELS } from '../../utils/roles';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

const EMPTY_FORM = { fullName: '', username: '', password: '', role: '' };

export default function AdminAgentsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(agentApi.listAgents, []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await agentApi.createAgent(form);
      setForm(EMPTY_FORM);
      showToast('Compte créé.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(agent) {
    try {
      if (agent.is_active) {
        await agentApi.deactivateAgent(agent.id);
      } else {
        await agentApi.updateAgent(agent.id, { isActive: true });
      }
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Action impossible.', 'error');
    }
  }

  async function resetPassword(agent) {
    const password = window.prompt(`Nouveau mot de passe pour ${agent.username} (min. 6 caractères) :`);
    if (!password) return;
    try {
      await agentApi.resetAgentPassword(agent.id, password);
      showToast('Mot de passe réinitialisé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la réinitialisation.', 'error');
    }
  }

  return (
    <div>
      <PageHeader title="Comptes agents" />

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">Créer un compte</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Nom complet"
            required
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <Input
            label="Identifiant"
            required
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
          <Input
            label="Mot de passe"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select
            label="Rôle"
            required
            placeholder="Choisir…"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'registrar', label: 'Agent enregistreur' },
              { value: 'logistics', label: 'Commission Orga' },
              { value: 'sante', label: 'Commission Santé' },
              { value: 'cuisine', label: 'Commission Cuisine' },
              { value: 'admin', label: 'Administrateur' },
            ]}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={submitting}>
            Créer
          </Button>
        </div>
      </form>

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {data.agents.map((agent, i) => (
            <div key={agent.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={agent.full_name} size={36} />
                  <div>
                    <p className="font-medium text-slate-900">{agent.full_name}</p>
                    <p className="text-sm text-slate-500">
                      {agent.username} · {ROLE_LABELS[agent.role]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={agent.is_active ? 'success' : 'neutral'}>{agent.is_active ? 'Actif' : 'Désactivé'}</Badge>
                  <Button variant="secondary" onClick={() => resetPassword(agent)} className="px-3 py-1.5 text-xs">
                    Réinit. mdp
                  </Button>
                  <Button
                    variant={agent.is_active ? 'danger' : 'secondary'}
                    onClick={() => toggleActive(agent)}
                    className="px-3 py-1.5 text-xs"
                  >
                    {agent.is_active ? 'Désactiver' : 'Réactiver'}
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
