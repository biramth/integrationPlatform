const db = require('../db/database');
const { manualAssignRoom, getHistoryForRoom } = require('../services/roomAssignmentService');
const auditService = require('../services/auditService');
const cache = require('../middleware/cache');

async function listRooms(req, res) {
  // departments_json : effectif par département dans chaque chambre — le chef
  // Orga y voit d'un coup d'œil si le mélange voulu par l'auto-assignation est
  // respecté, et où déplacer quelqu'un pour rééquilibrer.
  const rooms = await db.all(
    `SELECT r.*, COUNT(d.id) AS occupied,
       COALESCE((
         SELECT json_agg(json_build_object('department', x.department, 'count', x.n) ORDER BY x.n DESC)
         FROM (
           SELECT d2.department AS department, COUNT(*) AS n
           FROM dut1_records d2
           WHERE d2.room_id = r.id
           GROUP BY d2.department
         ) x
       ), '[]'::json) AS departments_json
     FROM rooms r
     LEFT JOIN dut1_records d ON d.room_id = r.id
     GROUP BY r.id
     ORDER BY r.label ASC`
  );

  res.json({
    rooms: rooms.map((r) => ({
      ...r,
      occupied: Number(r.occupied),
      departments:
        typeof r.departments_json === 'string' ? JSON.parse(r.departments_json) : r.departments_json || [],
    })),
  });
}

async function createRoom(req, res) {
  const { label, gender, capacity, building } = req.body;

  if (!label || !gender || !capacity) {
    return res.status(400).json({ error: 'label, gender et capacity sont requis.' });
  }
  if (!['M', 'F'].includes(gender)) {
    return res.status(400).json({ error: 'gender doit être M ou F.' });
  }
  if (Number(capacity) <= 0) {
    return res.status(400).json({ error: 'capacity doit être positif.' });
  }

  try {
    const result = await db.run(
      'INSERT INTO rooms (label, gender, capacity, building) VALUES ($1, $2, $3, $4) RETURNING id',
      [label, gender, Number(capacity), building || null]
    );

    const room = await db.get('SELECT * FROM rooms WHERE id = $1', [result.rows[0].id]);

    await auditService.logAction(req, {
      action: 'room.create',
      resourceType: 'room',
      resourceId: room.id,
      resourceLabel: room.label,
      commission: 'orga',
      after: room,
    });

    cache.invalidate('/api/stats');

    res.status(201).json({ room });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Une chambre avec ce label existe déjà.' });
    }
    throw err;
  }
}

async function updateRoom(req, res) {
  const { id } = req.params;
  const room = await db.get('SELECT * FROM rooms WHERE id = $1', [id]);
  if (!room) {
    return res.status(404).json({ error: 'Chambre introuvable.' });
  }

  const { label, gender, capacity, building } = req.body;
  if (gender && !['M', 'F'].includes(gender)) {
    return res.status(400).json({ error: 'gender doit être M ou F.' });
  }
  if (capacity !== undefined && Number(capacity) <= 0) {
    return res.status(400).json({ error: 'capacity doit être positif.' });
  }

  await db.run(
    `UPDATE rooms SET label = $1, gender = $2, capacity = $3, building = $4, updated_at = NOW() WHERE id = $5`,
    [
      label ?? room.label,
      gender ?? room.gender,
      capacity !== undefined ? Number(capacity) : room.capacity,
      building !== undefined ? building : room.building,
      id,
    ]
  );

  const updatedRoom = await db.get('SELECT * FROM rooms WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'room.update',
    resourceType: 'room',
    resourceId: id,
    resourceLabel: updatedRoom.label,
    commission: 'orga',
    before: room,
    after: updatedRoom,
  });

  cache.invalidate('/api/stats');

  res.json({ room: updatedRoom });
}

async function updateMattressCount(req, res) {
  const { id } = req.params;
  const room = await db.get('SELECT * FROM rooms WHERE id = $1', [id]);
  if (!room) {
    return res.status(404).json({ error: 'Chambre introuvable.' });
  }

  const { mattressCount } = req.body;
  const value = mattressCount === null || mattressCount === '' || mattressCount === undefined ? null : Number(mattressCount);
  if (value !== null && (Number.isNaN(value) || value < 0)) {
    return res.status(400).json({ error: 'mattressCount doit être un nombre positif ou nul.' });
  }

  await db.run(`UPDATE rooms SET mattress_count = $1, updated_at = NOW() WHERE id = $2`, [value, id]);

  await auditService.logAction(req, {
    action: 'room.update_mattress_count',
    resourceType: 'room',
    resourceId: id,
    resourceLabel: room.label,
    commission: 'orga',
    before: { mattress_count: room.mattress_count },
    after: { mattress_count: value },
  });

  res.json({ room: await db.get('SELECT * FROM rooms WHERE id = $1', [id]) });
}

async function deleteRoom(req, res) {
  const { id } = req.params;
  const occupiedRow = await db.get('SELECT COUNT(*) AS n FROM dut1_records WHERE room_id = $1', [id]);
  if (Number(occupiedRow.n) > 0) {
    return res.status(409).json({ error: 'Impossible de supprimer une chambre occupée.' });
  }

  const room = await db.get('SELECT * FROM rooms WHERE id = $1', [id]);
  if (!room) {
    return res.status(404).json({ error: 'Chambre introuvable.' });
  }

  try {
    await db.run('DELETE FROM rooms WHERE id = $1', [id]);

    await auditService.logAction(req, {
      action: 'room.delete',
      resourceType: 'room',
      resourceId: id,
      resourceLabel: room.label,
      commission: 'orga',
      before: room,
    });

    cache.invalidate('/api/stats');

    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: "Impossible de supprimer cette chambre : elle apparaît dans l'historique d'affectation d'un dossier DUT1.",
      });
    }
    throw err;
  }
}

async function reassignDut1Room(req, res) {
  const { id } = req.params;
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'roomId requis.' });
  }

  const before = await db.get(
    'SELECT room_id, first_name, last_name, created_by FROM dut1_records WHERE id = $1',
    [id]
  );
  if (!before) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  // Droits fins (la route ne filtre que par rôle) : le chef de commission, le
  // chef de pôle — et IT via son bypass — déplacent n'importe quel dossier ;
  // un agent Orga ne peut déplacer que celui qu'il a lui-même enregistré,
  // même règle que la suppression d'un dossier.
  const isLead = req.user.role === 'it' || req.user.isCommissionLead || req.user.isPoleLead;
  if (!isLead && before.created_by !== req.user.id) {
    return res.status(403).json({
      error: 'Vous ne pouvez déplacer que les dossiers que vous avez vous-même enregistrés.',
    });
  }

  try {
    await manualAssignRoom(Number(id), Number(roomId), req.user.id);
    const record = await db.get('SELECT id, room_id FROM dut1_records WHERE id = $1', [id]);

    await auditService.logAction(req, {
      action: 'dut1.room_reassign',
      resourceType: 'dut1_record',
      resourceId: id,
      resourceLabel: before ? `${before.first_name} ${before.last_name}` : null,
      commission: 'orga',
      before: { room_id: before?.room_id ?? null },
      after: { room_id: record.room_id },
    });

    cache.invalidate('/api/stats');

    res.json({ dut1Id: record.id, roomId: record.room_id });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

// Chambres compatibles pour un déplacement : même genre, au moins une place
// libre, avec la répartition par département (même agrégat que listRooms).
// Endpoint léger dédié à l'UI de déplacement — le chef Orga comme l'agent qui
// a enregistré le dossier en ont besoin sans accéder à la configuration
// complète des chambres (création/édition restent derrière roomRoutes.js,
// réservées au chef).
async function listAvailableRooms(req, res) {
  const gender = req.query.gender;
  if (gender !== 'M' && gender !== 'F') {
    return res.status(400).json({ error: "Paramètre gender requis ('M' ou 'F')." });
  }

  const rooms = await db.all(
    `SELECT r.id, r.label, r.gender, r.building, r.capacity, COUNT(d.id) AS occupied,
       COALESCE((
         SELECT json_agg(json_build_object('department', x.department, 'count', x.n) ORDER BY x.n DESC)
         FROM (
           SELECT d2.department AS department, COUNT(*) AS n
           FROM dut1_records d2
           WHERE d2.room_id = r.id
           GROUP BY d2.department
         ) x
       ), '[]'::json) AS departments_json
     FROM rooms r
     LEFT JOIN dut1_records d ON d.room_id = r.id
     WHERE r.gender = $1
     GROUP BY r.id
     HAVING COUNT(d.id) < r.capacity
     ORDER BY r.label ASC`,
    [gender]
  );

  res.json({
    rooms: rooms.map((r) => ({
      ...r,
      occupied: Number(r.occupied),
      departments:
        typeof r.departments_json === 'string' ? JSON.parse(r.departments_json) : r.departments_json || [],
    })),
  });
}

async function getRoomHistory(req, res) {
  const history = await getHistoryForRoom(req.params.id);
  res.json({ history });
}

module.exports = {
  listRooms,
  createRoom,
  updateRoom,
  updateMattressCount,
  deleteRoom,
  reassignDut1Room,
  listAvailableRooms,
  getRoomHistory,
};
