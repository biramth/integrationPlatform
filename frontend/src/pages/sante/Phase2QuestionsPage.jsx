import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ListChecks, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as phase2QuestionsApi from '../../api/phase2QuestionsApi';
import { PHASE2_QUESTION_TYPES, PHASE2_QUESTION_TYPE_LABELS, PHASE2_CHOICE_TYPES } from '../../utils/phase2QuestionTypes';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

const EMPTY_FORM = { label: '', type: 'texte_court', required: false, options: ['', ''] };

export default function Phase2QuestionsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(phase2QuestionsApi.listPhase2Questions, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const questions = data?.questions || [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(question) {
    setEditing(question);
    setForm({
      label: question.label,
      type: question.type,
      required: question.required,
      options: question.options && question.options.length > 0 ? question.options : ['', ''],
    });
    setModalOpen(true);
  }

  function updateOption(index, value) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }));
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ''] }));
  }

  function removeOption(index) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim()) return;
    const isChoice = PHASE2_CHOICE_TYPES.includes(form.type);
    const cleanedOptions = form.options.map((o) => o.trim()).filter(Boolean);
    if (isChoice && cleanedOptions.length < 2) {
      showToast('Au moins deux options sont requises pour ce type de question.', 'error');
      return;
    }

    setSubmitting(true);
    const payload = { label: form.label.trim(), type: form.type, required: form.required, options: isChoice ? cleanedOptions : null };
    try {
      if (editing) {
        await phase2QuestionsApi.updatePhase2Question(editing.id, payload);
        showToast('Question mise à jour.', 'success');
      } else {
        await phase2QuestionsApi.createPhase2Question(payload);
        showToast('Question ajoutée.', 'success');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de l\'enregistrement.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(question) {
    if (!window.confirm(`Supprimer la question "${question.label}" ?`)) return;
    try {
      await phase2QuestionsApi.deletePhase2Question(question.id);
      showToast('Question supprimée.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await phase2QuestionsApi.reorderPhase2Questions(reordered.map((q) => q.id));
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Réorganisation impossible.', 'error');
    }
  }

  const isChoiceType = PHASE2_CHOICE_TYPES.includes(form.type);

  return (
    <div>
      <PageHeader
        title="Questions phase 2"
        description="Questions posées lors du complément de dossier des DUT1, configurables par la commission Santé."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter une question
          </Button>
        }
      />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && questions.length === 0 && (
        <EmptyState label="Aucune question configurée." icon={ListChecks} />
      )}

      {!loading && !error && questions.length > 0 && (
        <div className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <div key={q.id} className="animate-fade-in-up" style={staggerStyle(i, 20, 200)}>
              <Card className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Monter"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === questions.length - 1}
                      className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Descendre"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{q.label}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="neutral">{PHASE2_QUESTION_TYPE_LABELS[q.type] || q.type}</Badge>
                      {q.required && <Badge variant="warning">Obligatoire</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(q)}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(q)}
                    className="flex items-center gap-1 text-xs text-danger transition-colors hover:opacity-80 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la question' : 'Nouvelle question'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Intitulé"
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <Select
            label="Type de réponse"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={PHASE2_QUESTION_TYPES}
          />

          {isChoiceType && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Options</span>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="min-h-[40px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-muted-foreground transition-colors hover:text-danger"
                      aria-label="Retirer cette option"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 self-start text-xs text-role-accent transition-colors hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une option
              </button>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
            />
            Réponse obligatoire
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
