import Badge from '../common/Badge';
import { SEVERITY_LABELS, SEVERITY_BADGE_VARIANT } from '../../utils/severity';
import { formatQuestionAnswer } from '../../utils/phase2Answers';

// Lecture seule des réponses d'un DUT1 au questionnaire de phase 2, dans
// l'ordre configuré par le chef Santé. Même contenu que le récap de la page
// "Compléter", mais utilisable partout où l'on a besoin de consulter le
// dossier médical sans le modifier — notamment Suivi santé, où déclarer une
// restriction suppose de relire ce que le DUT1 a déclaré (traitement,
// allergies, aptitude et questions libres).
export default function Dut1ComplementaryAnswers({
  questions,
  values,
  allergens,
  aptitudeLevels,
  onTreatment,
  treatmentDetails,
  completed,
}) {
  function unanswered() {
    return <span className="mt-1 block text-sm text-muted-foreground">—</span>;
  }

  function answered(text) {
    return <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{text}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => (
        <div key={q.field_key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{q.label}</p>

          {q.type === 'traitement_medical' &&
            (onTreatment === true ? (
              answered(treatmentDetails || 'Traitement déclaré.')
            ) : onTreatment === false ? (
              <p className="mt-1 text-sm text-muted-foreground">Aucun traitement déclaré.</p>
            ) : (
              unanswered()
            ))}

          {q.type === 'allergies' &&
            (allergens.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {allergens.map((a) => (
                  <Badge key={a.id} variant={SEVERITY_BADGE_VARIANT[a.severity] || 'neutral'}>
                    {a.label} — {SEVERITY_LABELS[a.severity] || a.severity}
                  </Badge>
                ))}
              </div>
            ) : completed ? (
              <p className="mt-1 text-sm text-muted-foreground">Aucune allergie déclarée.</p>
            ) : (
              unanswered()
            ))}

          {q.type === 'aptitude' &&
            (aptitudeLevels.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {aptitudeLevels.map((level) => (
                  <Badge key={level.criterionId} variant="neutral">
                    {level.criterionLabel} : {level.levelLabel}
                  </Badge>
                ))}
              </div>
            ) : completed ? (
              <p className="mt-1 text-sm text-muted-foreground">Aucun critère renseigné.</p>
            ) : (
              unanswered()
            ))}

          {!['traitement_medical', 'allergies', 'aptitude'].includes(q.type) &&
            (() => {
              const answer = formatQuestionAnswer(q, values?.[q.field_key]);
              return answer ? answered(answer) : unanswered();
            })()}
        </div>
      ))}
    </div>
  );
}
