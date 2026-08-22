const db = require('../db/database');
const auditService = require('../services/auditService');

const MOVEMENT_TYPES = ['entree', 'sortie', 'ajustement'];

function withPercent(m) {
  const percent = m.reference_stock > 0 ? Math.round((m.current_stock / m.reference_stock) * 100) : 0;
  return { ...m, percent, low: percent <= m.alert_threshold_percent };
}

async function listMedications(req, res) {
  const medications = await db.all('SELECT * FROM medications ORDER BY name ASC');
  res.json({ medications: medications.map(withPercent) });
}

async function createMedication(req, res) {
  const { name, unit, referenceStock, currentStock, alertThresholdPercent } = req.body;
  if (!name || !referenceStock || Number(referenceStock) <= 0) {
    return res.status(400).json({ error: 'Nom et stock de référence (supérieur à 0) requis.' });
  }

  try {
    const result = await db.run(
      `INSERT INTO medications (name, unit, reference_stock, current_stock, alert_threshold_percent, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        name,
        unit || 'unité(s)',
        Number(referenceStock),
        Number(currentStock) || 0,
        alertThresholdPercent != null ? Number(alertThresholdPercent) : 20,
        req.user.id,
      ]
    );
    const medication = await db.get('SELECT * FROM medications WHERE id = $1', [result.rows[0].id]);

    await auditService.logAction(req, {
      action: 'medication.create',
      resourceType: 'medication',
      resourceId: medication.id,
      resourceLabel: medication.name,
      commission: 'sante',
      after: medication,
    });

    res.status(201).json({ medication: withPercent(medication) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce médicament existe déjà.' });
    }
    throw err;
  }
}

async function updateMedication(req, res) {
  const { id } = req.params;
  const { name, unit, referenceStock, alertThresholdPercent } = req.body;

  const existing = await db.get('SELECT * FROM medications WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Médicament introuvable.' });
  }
  if (referenceStock !== undefined && Number(referenceStock) <= 0) {
    return res.status(400).json({ error: 'Le stock de référence doit être supérieur à 0.' });
  }

  await db.run(
    `UPDATE medications SET name = $1, unit = $2, reference_stock = $3, alert_threshold_percent = $4, updated_at = NOW()
     WHERE id = $5`,
    [
      name ?? existing.name,
      unit ?? existing.unit,
      referenceStock !== undefined ? Number(referenceStock) : existing.reference_stock,
      alertThresholdPercent !== undefined ? Number(alertThresholdPercent) : existing.alert_threshold_percent,
      id,
    ]
  );
  const medication = await db.get('SELECT * FROM medications WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'medication.update',
    resourceType: 'medication',
    resourceId: id,
    resourceLabel: medication.name,
    commission: 'sante',
    before: existing,
    after: medication,
  });

  res.json({ medication: withPercent(medication) });
}

async function deleteMedication(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM medications WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Médicament introuvable.' });
  }

  await db.run('DELETE FROM medications WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'medication.delete',
    resourceType: 'medication',
    resourceId: id,
    resourceLabel: existing.name,
    commission: 'sante',
    before: existing,
  });

  res.status(204).send();
}

// type = 'entree' | 'sortie' : quantity est la quantité ajoutée/retirée.
// type = 'ajustement' : quantity est le nouveau stock compté (recomptage
// physique), pas un delta — le delta réel est recalculé ici.
async function recordMovement(req, res) {
  const { id } = req.params;
  const { type, quantity, note } = req.body;

  if (!MOVEMENT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Type de mouvement invalide.' });
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({ error: 'Quantité invalide.' });
  }

  const medication = await db.get('SELECT * FROM medications WHERE id = $1', [id]);
  if (!medication) {
    return res.status(404).json({ error: 'Médicament introuvable.' });
  }

  let delta;
  if (type === 'entree') delta = qty;
  else if (type === 'sortie') delta = -qty;
  else delta = qty - medication.current_stock;

  if (delta === 0) {
    return res.status(400).json({ error: 'Ce recomptage ne change pas le stock actuel.' });
  }
  const newStock = medication.current_stock + delta;
  if (newStock < 0) {
    return res.status(400).json({ error: 'Stock insuffisant pour cette sortie.' });
  }

  const updated = await db.transaction(async (client) => {
    await client.run('UPDATE medications SET current_stock = $1, updated_at = NOW() WHERE id = $2', [newStock, id]);
    await client.run(
      `INSERT INTO medication_movements (medication_id, type, quantity, stock_after, note, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, type, delta, newStock, note || null, req.user.id]
    );
    return client.get('SELECT * FROM medications WHERE id = $1', [id]);
  });

  await auditService.logAction(req, {
    action: `medication.${type}`,
    resourceType: 'medication',
    resourceId: id,
    resourceLabel: medication.name,
    commission: 'sante',
    before: { current_stock: medication.current_stock },
    after: { current_stock: newStock },
  });

  res.status(201).json({ medication: withPercent(updated) });
}

async function listMovements(req, res) {
  const { id } = req.params;
  const movements = await db.all(
    `SELECT mm.*, u.full_name AS recorded_by_name
     FROM medication_movements mm
     JOIN users u ON u.id = mm.recorded_by
     WHERE mm.medication_id = $1
     ORDER BY mm.created_at DESC
     LIMIT 100`,
    [id]
  );
  res.json({ movements });
}

module.exports = {
  listMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  recordMovement,
  listMovements,
};
