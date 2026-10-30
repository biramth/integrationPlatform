const db = require('../db/database');
const cache = require('../middleware/cache');

// La liste des questions est mise en cache 60 s par la route. Ces mutations ne
// passent pas par auditService (aucune action métier journalisée ici), donc
// c'est à elles de vider le cache : sinon le formulaire phase 2 réafficherait
// l'ancienne question jusqu'à une minute après sa création ou son renommage.
function invalidateQuestionList() {
  cache.invalidate('/api/phase2-questions');
}

// Types "libres" : le chef en crée autant qu'il veut, réponse stockée dans
// dut1_records.extra_fields_json sous field_key.
const CUSTOM_TYPES = ['texte_court', 'texte_long', 'choix_unique', 'choix_multiple', 'oui_non'];
const CHOICE_TYPES = ['choix_unique', 'choix_multiple'];

// Types "intégrés" : traitement/allergies/aptitude, câblés sur leurs
// colonnes/tables dédiées (dut1_records.on_treatment/treatment_details,
// dut1_allergens, dut1_aptitude_levels) — jamais sur extra_fields_json. Créés
// une seule fois par le seed du schéma, jamais par createQuestion.
const BUILTIN_TYPES = ['traitement_medical', 'allergies', 'aptitude'];
// traitement_medical, allergies et aptitude alimentent Risques du jour (et le
// croisement menu/allergènes pour allergies) : suppression bloquée, ce sont
// les trois seuls types intégrés.
const LOCKED_DELETE_TYPES = ['traitement_medical', 'allergies', 'aptitude'];

const TYPES = [...CUSTOM_TYPES, ...BUILTIN_TYPES];

function slugify(label) {
  const base = label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return base || 'question';
}

async function uniqueFieldKey(base) {
  let key = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.get('SELECT id FROM phase2_questions WHERE field_key = $1', [key]);
    if (!existing) return key;
    key = `${base}_${n}`;
    n += 1;
  }
}

function cleanOptions(type, options) {
  if (!CHOICE_TYPES.includes(type)) return null;
  const cleaned = (Array.isArray(options) ? options : [])
    .map((o) => (typeof o === 'string' ? o.trim() : ''))
    .filter(Boolean);
  return cleaned.length >= 2 ? cleaned : null;
}

async function listQuestions(req, res) {
  const questions = await db.all('SELECT * FROM phase2_questions ORDER BY position ASC, id ASC');
  res.json({ questions });
}

async function createQuestion(req, res) {
  const { label, type, required } = req.body;
  if (!label?.trim()) {
    return res.status(400).json({ error: 'label requis.' });
  }
  if (!CUSTOM_TYPES.includes(type)) {
    return res.status(400).json({ error: 'type invalide.' });
  }
  const options = cleanOptions(type, req.body.options);
  if (CHOICE_TYPES.includes(type) && !options) {
    return res.status(400).json({ error: 'Au moins deux options sont requises pour ce type de question.' });
  }

  const fieldKey = await uniqueFieldKey(slugify(label.trim()));
  const posRow = await db.get('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM phase2_questions');

  const result = await db.run(
    `INSERT INTO phase2_questions (field_key, label, type, options, required, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [fieldKey, label.trim(), type, options ? JSON.stringify(options) : null, !!required, Number(posRow.next), req.user.id]
  );
  const question = await db.get('SELECT * FROM phase2_questions WHERE id = $1', [result.rows[0].id]);
  invalidateQuestionList();
  res.status(201).json({ question });
}

async function updateQuestion(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM phase2_questions WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Question introuvable.' });
  }

  const { label, required } = req.body;
  if (!label?.trim()) {
    return res.status(400).json({ error: 'label requis.' });
  }

  // Le type d'une question intégrée (traitement_medical/allergies) est
  // figé : sa réponse vit dans une colonne/table dédiée, pas dans
  // extra_fields_json, donc rien d'autre que ce type précis n'a de sens pour
  // elle. Une question libre ne peut pas non plus en devenir une (elles ne
  // se créent qu'au seed du schéma).
  if (BUILTIN_TYPES.includes(existing.type)) {
    if (req.body.type && req.body.type !== existing.type) {
      return res.status(400).json({ error: 'Le type de cette question est fixe et ne peut pas être modifié.' });
    }
    await db.run(`UPDATE phase2_questions SET label = $1, updated_at = NOW() WHERE id = $2`, [label.trim(), id]);
    invalidateQuestionList();
    return res.json({ question: await db.get('SELECT * FROM phase2_questions WHERE id = $1', [id]) });
  }

  const nextType = req.body.type || existing.type;
  if (!CUSTOM_TYPES.includes(nextType)) {
    return res.status(400).json({ error: 'type invalide.' });
  }
  const options = cleanOptions(nextType, req.body.options !== undefined ? req.body.options : existing.options);
  if (CHOICE_TYPES.includes(nextType) && !options) {
    return res.status(400).json({ error: 'Au moins deux options sont requises pour ce type de question.' });
  }

  // field_key ne change jamais : les réponses déjà enregistrées dans
  // extra_fields_json y restent rattachées même après un renommage du libellé.
  await db.run(
    `UPDATE phase2_questions SET label = $1, type = $2, options = $3, required = $4, updated_at = NOW() WHERE id = $5`,
    [label.trim(), nextType, options ? JSON.stringify(options) : null, !!required, id]
  );
  invalidateQuestionList();
  res.json({ question: await db.get('SELECT * FROM phase2_questions WHERE id = $1', [id]) });
}

async function deleteQuestion(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT type FROM phase2_questions WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Question introuvable.' });
  }
  if (LOCKED_DELETE_TYPES.includes(existing.type)) {
    return res
      .status(400)
      .json({ error: 'Cette question est essentielle au fonctionnement de la plateforme et ne peut pas être supprimée.' });
  }

  await db.run('DELETE FROM phase2_questions WHERE id = $1', [id]);
  invalidateQuestionList();
  res.status(204).send();
}

async function reorderQuestions(req, res) {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ error: 'orderedIds requis.' });
  }

  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await trx.run('UPDATE phase2_questions SET position = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
  });

  invalidateQuestionList();

  res.json({ questions: await db.all('SELECT * FROM phase2_questions ORDER BY position ASC, id ASC') });
}

module.exports = {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  TYPES,
  CUSTOM_TYPES,
  BUILTIN_TYPES,
  CHOICE_TYPES,
};
