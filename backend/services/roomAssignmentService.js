const db = require('../db/database');

const findAvailableRoomStmt = db.prepare(`
  SELECT r.id, r.capacity, COUNT(d.id) AS occupied
  FROM rooms r
  LEFT JOIN dut1_records d ON d.room_id = r.id
  WHERE r.gender = @gender
  GROUP BY r.id
  HAVING occupied < r.capacity
  ORDER BY r.id ASC
  LIMIT 1
`);

const logHistoryStmt = db.prepare(`
  INSERT INTO room_assignment_history (dut1_id, old_room_id, new_room_id, changed_by, reason)
  VALUES (@dut1_id, @old_room_id, @new_room_id, @changed_by, @reason)
`);

const assignRoomToRecordStmt = db.prepare(`
  UPDATE dut1_records SET room_id = @roomId, room_assigned_at = datetime('now') WHERE id = @dut1Id
`);

function roomOccupancy(roomId) {
  return db
    .prepare('SELECT COUNT(*) AS occupied FROM dut1_records WHERE room_id = ?')
    .get(roomId).occupied;
}

const autoAssignRoom = db.transaction((dut1Id, gender, changedBy) => {
  const room = findAvailableRoomStmt.get({ gender });

  if (!room) {
    return null;
  }

  assignRoomToRecordStmt.run({ roomId: room.id, dut1Id });
  logHistoryStmt.run({
    dut1_id: dut1Id,
    old_room_id: null,
    new_room_id: room.id,
    changed_by: changedBy,
    reason: 'auto_assignment',
  });

  return room.id;
});

const manualAssignRoom = db.transaction((dut1Id, newRoomId, changedBy) => {
  const record = db.prepare('SELECT room_id, gender FROM dut1_records WHERE id = ?').get(dut1Id);
  if (!record) {
    const err = new Error('Dossier DUT1 introuvable.');
    err.status = 404;
    throw err;
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(newRoomId);
  if (!room) {
    const err = new Error('Chambre introuvable.');
    err.status = 404;
    throw err;
  }

  if (room.gender !== record.gender) {
    const err = new Error('Le genre de la chambre ne correspond pas à celui du DUT1.');
    err.status = 409;
    throw err;
  }

  const occupied = roomOccupancy(newRoomId);
  if (occupied >= room.capacity) {
    const err = new Error('Chambre déjà pleine.');
    err.status = 409;
    throw err;
  }

  assignRoomToRecordStmt.run({ roomId: newRoomId, dut1Id });
  logHistoryStmt.run({
    dut1_id: dut1Id,
    old_room_id: record.room_id,
    new_room_id: newRoomId,
    changed_by: changedBy,
    reason: 'manual_reassignment',
  });

  return newRoomId;
});

module.exports = { autoAssignRoom, manualAssignRoom, roomOccupancy };
