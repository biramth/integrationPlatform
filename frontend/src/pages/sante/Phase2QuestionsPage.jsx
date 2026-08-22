import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ListChecks, X, Lock, Pencil, Check } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as phase2QuestionsApi from '../../api/phase2QuestionsApi';
import {
  PHASE2_QUESTION_TYPES,
  PHASE2_QUESTION_TYPE_LABELS,
  PHASE2_CHOICE_TYPES,
  PHASE2_LOCKED_DELETE_TYPES,
  isPhase2QuestionLocked,
} from '../../utils/phase2QuestionTypes';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { confirm } from '../../components/common/confirmService';
import AllergensManager from '../../components/sante/AllergensManager';
import { ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

const NEW_DRAFT = { id: 'new', label: '', type: 'texte_court', required: false, options: ['', ''] };

const PREVIEW_NOTE = {
  traitement_medical: 'Réponse Oui/Non, avec détail des traitements si Oui.',
  allergies: "Oui/Non, puis sélection des allergies déclarées si Oui, avec niveau de sévérité.",
};

function QuestionPreview({ question }) {
  if (question.type in PREVIEW_NOTE) {
    return <p className="text-sm italic text-muted-foreground">{PREVIEW_NOTE[question.type]}</p>;
  }
  if (question.type === 'texte_court') {
    return <div className="h-10 w-full max-w-sm rounded-lg border border-dashed border-border bg-muted/40" />;
  }
  if (question.type === 'texte_long') {
    return <div className="h-16 w-full rounded-lg border border-dashed border-border bg-muted/40" />;
  }
  if (question.type === 'oui_non') {
    return (
      <div className="flex gap-2">
        <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">Oui</span>
        <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">Non</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {(question.options || []).map((opt) => (
        <span key={opt} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
          {opt}
        </span>
      ))}
    </div>
  );
}

function QuestionEditor({ draft, onChange, onSave, onCancel, saving, locked }) {
  const isChoiceType = PHASE2_CHOICE_TYPES.includes(draft.type);

  function updateOption(index, value) {
    onChange({ ...draft, options: draft.options.map((o, i) => (i === index ? value : o)) });
  }
  function addOption() {
    onChange({ ...draft, options: [...draft.options, ''] });
  }
  function removeOption(index) {
    onChange({ ...draft, options: draft.options.filter((_, i) => i !== index) });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex flex-col gap-3"
    >
      <Input label="Intitulé" required value={draft.label} onChange={(e) => onChange({ ...draft, label: e.target.value })} autoFocus />

      {locked ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Type de réponse</span>
          <p className="text-sm text-muted-foreground">
            {PHASE2_QUESTION_TYPE_LABELS[draft.type] || draft.type} — fixe, ne peut pas être modifié.
          </p>
        </div>
      ) : (
        <Select
          label="Type de réponse"
          value={draft.type}
          onChange={(e) => onChange({ ...draft, type: e.target.value })}
          options={PHASE2_QUESTION_TYPES}
        />
      )}

      {isChoiceType && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Options</span>
          {draft.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="min-h-[40px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {draft.options.length > 2 && (
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

      {!locked && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={draft.required} onChange={(e) => onChange({ ...draft, required: e.target.checked })} />
          Réponse obligatoire
        </label>
      )}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          <Check className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </form>
  );
}

export default function Phase2QuestionsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(phase2QuestionsApi.listPhase2Questions, []);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const questions = data?.questions || [];

  function startEdit(question) {
    setEditingId(question.id);
    setDraft({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      options: question.options && question.options.length > 0 ? question.options : ['', ''],
    });
  }

  function startCreate() {
    setEditingId('new');
    setDraft({ ...NEW_DRAFT });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveDraft() {
    if (!draft.label.trim()) return;
    const isChoiceType = PHASE2_CHOICE_TYPES.includes(draft.type);
    const cleanedOptions = draft.options.map((o) => o.trim()).filter(Boolean);
    if (isChoiceType && cleanedOptions.length < 2) {
      showToast('Au moins deux options sont requises pour ce type de question.', 'error');
      return;
    }

    setSaving(true);
    const payload = { label: draft.label.trim(), type: draft.type, required: draft.required, options: isChoiceType ? cleanedOptions : null };
    try {
      if (editingId === 'new') {
        await phase2QuestionsApi.createPhase2Question(payload);
        showToast('Question ajoutée.', 'success');
      } else {
        await phase2QuestionsApi.updatePhase2Question(editingId, payload);
        showToast('Question mise à jour.', 'success');
      }
      cancelEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'enregistrement.", 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(question) {
    if (!(await confirm({ message: `Supprimer la question "${question.label}" ?`, danger: true }))) return;
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

  return (
    <div>
      <PageHeader
        title="Questionnaire phase 2"
        description="Le questionnaire complet posé au complément de dossier des DUT1, dans l'ordre où il apparaît aux agents — réordonner, modifier ou ajouter une question ci-dessous."
        action={
          editingId === null && (
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" /> Ajouter une question
            </Button>
          )
        }
      />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => {
            const locked = isPhase2QuestionLocked(q.type);
            const deletable = !PHASE2_LOCKED_DELETE_TYPES.includes(q.type);
            const isEditing = editingId === q.id;

            return (
              <div key={q.id} className="animate-fade-in-up" style={staggerStyle(i, 20, 200)}>
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 flex-col pt-0.5">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || editingId !== null}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Monter"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === questions.length - 1 || editingId !== null}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Descendre"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <QuestionEditor
                          draft={draft}
                          onChange={setDraft}
                          onSave={saveDraft}
                          onCancel={cancelEdit}
                          saving={saving}
                          locked={locked}
                        />
                      ) : (
                        <>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">
                              {q.label}
                              {q.required && <span className="text-danger"> *</span>}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                onClick={() => startEdit(q)}
                                disabled={editingId !== null}
                                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Modifier
                              </button>
                              {deletable && (
                                <button
                                  onClick={() => handleDelete(q)}
                                  disabled={editingId !== null}
                                  className="flex items-center gap-1 text-xs text-danger transition-colors hover:opacity-80 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            <Badge variant="neutral">{PHASE2_QUESTION_TYPE_LABELS[q.type] || q.type}</Badge>
                            {locked && (
                              <Badge variant="warning">
                                <Lock className="mr-1 inline h-3 w-3" /> Verrouillé
                              </Badge>
                            )}
                          </div>
                          <QuestionPreview question={q} />
                          {q.type === 'allergies' && (
                            <div className="mt-4 border-t border-border pt-4">
                              <p className="mb-3 text-sm font-medium text-foreground">Allergènes proposés</p>
                              <AllergensManager />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}

          {editingId === 'new' && (
            <div className="animate-fade-in-up">
              <Card>
                <p className="mb-3 text-sm font-semibold text-foreground">Nouvelle question</p>
                <QuestionEditor draft={draft} onChange={setDraft} onSave={saveDraft} onCancel={cancelEdit} saving={saving} locked={false} />
              </Card>
            </div>
          )}

          {questions.length === 0 && editingId !== 'new' && (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <ListChecks className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <span>Aucune question configurée.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
