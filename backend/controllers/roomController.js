const db = require('../db/database');
const { manualAssignRoom, getHistoryForRoom } = require('../services/roomAssignmentService');

async function listRooms(req, res) {
  const rooms = await db.all(
    `SELECT r.*, COUNT(d.id) AS occupied
     FROM rooms r
     LEFT JOIN dut1_records d ON d.room_id = r.id
     GROUP BY r.id
     ORDER BY r.label ASC`
  );

  res.json({ rooms: rooms.map((r) => ({ ...r, occupied: Number(r.occupied) })) });
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

  res.json({ room: await db.get('SELECT * FROM rooms WHERE id = $1', [id]) });
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
  res.json({ room: await db.get('SELECT * FROM rooms WHERE id = $1', [id]) });
}

async function deleteRoom(req, res) {
  const { id } = req.params;
  const occupiedRow = await db.get('SELECT COUNT(*) AS n FROM dut1_records WHERE room_id = $1', [id]);
  if (Number(occupiedRow.n) > 0) {
    return res.status(409).json({ error: 'Impossible de supprimer une chambre occupée.' });
  }

  try {
    const result = await db.run('DELETE FROM rooms WHERE id = $1', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Chambre introuvable.' });
    }
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

  try {
    await manualAssignRoom(Number(id), Number(roomId), req.user.id);
    const record = await db.get('SELECT id, room_id FROM dut1_records WHERE id = $1', [id]);
    res.json({ dut1Id: record.id, roomId: record.room_id });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
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
  getRoomHistory,
};
