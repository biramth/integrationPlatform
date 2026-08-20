import { useState } from 'react';
import { Plus, KeyRound, Ban, RotateCcw, Pencil, Check, X, Trash2 } from 'lucide-react';
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
import { ROLE_LABELS, ROLES, ORGA_SUB_ROLE_LABELS } from '../../utils/roles';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

const EMPTY_FORM = { fullName: '', username: '', password: '', role: '', subRole: '', isCommissionLead: false, canResetPlatform: false };

const ROLE_OPTIONS = Object.values(ROLES).map((value) => ({ value, label: ROLE_LABELS[value] }));
const SUB_ROLE_OPTIONS = Object.entries(ORGA_SUB_ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function AdminAgentsPage() {
  const { user } = useAuth();
  const isPrivileged = user.role === 'admin' || user.role === 'it';
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(agentApi.listAgents, []);
  const [form, setForm] = useState(isPrivileged ? EMPTY_FORM : { ...EMPTY_FORM, role: user.role });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Un chef de commission ne peut créer/éditer des comptes que pour sa propre
  // commission — le backend le vérifie de toute façon, mais autant ne pas
  // proposer un choix qui sera refusé.
  const roleOptions = isPrivileged ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value === user.role);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await agentApi.createAgent({
        ...form,
        subRole: form.role === 'orga' && form.subRole ? form.subRole : null,
        canResetPlatform: form.role === 'it' ? form.canResetPlatform : false,
      });
      setForm(isPrivileged ? EMPTY_FORM : { ...EMPTY_FORM, role: user.role });
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

  async function handleHardDelete(agent) {
    if (!window.confirm(`Supprimer définitivement le compte de ${agent.full_name} ? Cette action est irréversible.`)) return;
    try {
      await agentApi.hardDeleteAgent(agent.id);
      showToast('Compte supprimé définitivement.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  function startEdit(agent) {
    setEditingId(agent.id);
    setEditForm({
      fullName: agent.full_name,
      role: agent.role,
      subRole: agent.sub_role || '',
      isCommissionLead: agent.is_commission_lead,
      canResetPlatform: agent.can_reset_platform,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(agent) {
    if (!editForm.fullName.trim() || !editForm.role) return;
    setSaving(true);
    try {
      await agentApi.updateAgent(agent.id, {
        ...editForm,
        subRole: editForm.role === 'orga' && editForm.subRole ? editForm.subRole : null,
        canResetPlatform: editForm.role === 'it' ? editForm.canResetPlatform : false,
      });
      showToast('Compte mis à jour.', 'success');
      cancelEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Mise à jour impossible.', 'error');
    } finally {
      setSaving(false);
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
      <PageHeader
        title="Comptes agents"
        description={isPrivileged ? undefined : `Tu gères les comptes de la ${ROLE_LABELS[user.role]}.`}
      />

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Créer un compte</p>
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
            options={roleOptions}
          />
        </div>

        {form.role === 'orga' && (
          <div className="mt-3">
            <Select
              label="Sous-rôle (optionnel — vide = accès aux trois domaines)"
              placeholder="Chambres + Enregistrement + Bagages"
              value={form.subRole}
              onChange={(e) => setForm((f) => ({ ...f, subRole: e.target.value }))}
              options={SUB_ROLE_OPTIONS}
              className="sm:max-w-xs"
            />
          </div>
        )}

        {isPrivileged && (
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isCommissionLead}
                onChange={(e) => setForm((f) => ({ ...f, isCommissionLead: e.target.checked }))}
              />
              Chef de commission (gère les comptes de sa commission)
            </label>
            {form.role === 'it' && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.canResetPlatform}
                  onChange={(e) => setForm((f) => ({ ...f, canResetPlatform: e.target.checked }))}
                />
                Habilité à réinitialiser la plateforme
              </label>
            )}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" /> Créer
          </Button>
        </div>
      </form>

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {data.agents.map((agent, i) => {
            const editing = editingId === agent.id;
            return (
              <div key={agent.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Card className="flex flex-col gap-3">
                  {editing ? (
                    <>
                      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                        <Input
                          value={editForm.fullName}
                          onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                          className="sm:max-w-xs"
                        />
                        <Select
                          value={editForm.role}
                          onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                          className="sm:max-w-[220px]"
                          options={roleOptions}
                          disabled={!isPrivileged}
                        />
                        {editForm.role === 'orga' && (
                          <Select
                            placeholder="Tous les sous-domaines"
                            value={editForm.subRole}
                            onChange={(e) => setEditForm((f) => ({ ...f, subRole: e.target.value }))}
                            className="sm:max-w-[220px]"
                            options={SUB_ROLE_OPTIONS}
                          />
                        )}
                      </div>
                      {isPrivileged && (
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={!!editForm.isCommissionLead}
                              onChange={(e) => setEditForm((f) => ({ ...f, isCommissionLead: e.target.checked }))}
                            />
                            Chef de commission
                          </label>
                          {editForm.role === 'it' && (
                            <label className="flex items-center gap-2 text-sm text-foreground">
                              <input
                                type="checkbox"
                                checked={!!editForm.canResetPlatform}
                                onChange={(e) => setEditForm((f) => ({ ...f, canResetPlatform: e.target.checked }))}
                              />
                              Habilité reset plateforme
                            </label>
                          )}
                        </div>
                      )}
                      <div className="flex shrink-0 items-center gap-2 self-end">
                        <Button onClick={() => handleSaveEdit(agent)} loading={saving} className="px-3 py-1.5 text-xs">
                          <Check className="h-3.5 w-3.5" /> Enregistrer
                        </Button>
                        <Button variant="secondary" onClick={cancelEdit} className="px-3 py-1.5 text-xs">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={agent.full_name} size={36} />
                        <div>
                          <p className="font-medium text-foreground">{agent.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {agent.username} · {ROLE_LABELS[agent.role]}
                            {agent.sub_role ? ` (${ORGA_SUB_ROLE_LABELS[agent.sub_role]})` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={agent.is_active ? 'success' : 'neutral'}>{agent.is_active ? 'Actif' : 'Désactivé'}</Badge>
                        {agent.is_commission_lead && <Badge variant="info">Chef de commission</Badge>}
                        {agent.can_reset_platform && <Badge variant="danger">Habilité reset</Badge>}
                        <Button variant="secondary" onClick={() => startEdit(agent)} className="px-3 py-1.5 text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </Button>
                        <Button variant="secondary" onClick={() => resetPassword(agent)} className="px-3 py-1.5 text-xs">
                          <KeyRound className="h-3.5 w-3.5" /> Réinit. mdp
                        </Button>
                        <Button
                          variant={agent.is_active ? 'danger' : 'secondary'}
                          onClick={() => toggleActive(agent)}
                          className="px-3 py-1.5 text-xs"
                        >
                          {agent.is_active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          {agent.is_active ? 'Désactiver' : 'Réactiver'}
                        </Button>
                        {isPrivileged && agent.id !== user.id && (
                          <Button variant="danger" onClick={() => handleHardDelete(agent)} className="px-3 py-1.5 text-xs">
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
