const db = require('../db/database');

const TYPES = ['texte_court', 'texte_long', 'choix_unique', 'choix_multiple', 'oui_non'];
const CHOICE_TYPES = ['choix_unique', 'choix_multiple'];

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
  if (!TYPES.includes(type)) {
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
  res.status(201).json({ question });
}

async function updateQuestion(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM phase2_questions WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Question introuvable.' });
  }

  const { label, type, required } = req.body;
  if (!label?.trim()) {
    return res.status(400).json({ error: 'label requis.' });
  }
  const nextType = type || existing.type;
  if (!TYPES.includes(nextType)) {
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
  res.json({ question: await db.get('SELECT * FROM phase2_questions WHERE id = $1', [id]) });
}

async function deleteQuestion(req, res) {
  const { id } = req.params;
  const result = await db.run('DELETE FROM phase2_questions WHERE id = $1', [id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Question introuvable.' });
  }
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

  res.json({ questions: await db.all('SELECT * FROM phase2_questions ORDER BY position ASC, id ASC') });
}

module.exports = { listQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions, TYPES, CHOICE_TYPES };
