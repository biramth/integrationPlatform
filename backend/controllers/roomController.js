const db = require('../db/database');
const { manualAssignRoom } = require('../services/roomAssignmentService');

function listRooms(req, res) {
  const rooms = db
    .prepare(
      `SELECT r.*, COUNT(d.id) AS occupied
       FROM rooms r
       LEFT JOIN dut1_records d ON d.room_id = r.id
       GROUP BY r.id
       ORDER BY r.label ASC`
    )
    .all();

  res.json({ rooms });
}

function createRoom(req, res) {
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
    const result = db
      .prepare('INSERT INTO rooms (label, gender, capacity, building) VALUES (?, ?, ?, ?)')
      .run(label, gender, Number(capacity), building || null);

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ room });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Une chambre avec ce label existe déjà.' });
    }
    throw err;
  }
}

function updateRoom(req, res) {
  const { id } = req.params;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
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

  db.prepare(
    `UPDATE rooms SET label = ?, gender = ?, capacity = ?, building = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    label ?? room.label,
    gender ?? room.gender,
    capacity !== undefined ? Number(capacity) : room.capacity,
    building !== undefined ? building : room.building,
    id
  );

  res.json({ room: db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) });
}

function deleteRoom(req, res) {
  const { id } = req.params;
  const occupied = db.prepare('SELECT COUNT(*) AS n FROM dut1_records WHERE room_id = ?').get(id).n;
  if (occupied > 0) {
    return res.status(409).json({ error: 'Impossible de supprimer une chambre occupée.' });
  }

  const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Chambre introuvable.' });
  }

  res.status(204).send();
}

function reassignDut1Room(req, res) {
  const { id } = req.params;
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'roomId requis.' });
  }

  try {
    manualAssignRoom(Number(id), Number(roomId), req.user.id);
    const record = db.prepare('SELECT id, room_id FROM dut1_records WHERE id = ?').get(id);
    res.json({ dut1Id: record.id, roomId: record.room_id });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

module.exports = { listRooms, createRoom, updateRoom, deleteRoom, reassignDut1Room };
