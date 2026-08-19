const db = require('../db/database');

async function roomOccupancy(roomId) {
  const row = await db.get('SELECT COUNT(*) AS occupied FROM dut1_records WHERE room_id = $1', [roomId]);
  return Number(row.occupied);
}

async function autoAssignRoom(dut1Id, gender, changedBy) {
  return db.transaction(async (tx) => {
    const room = await tx.get(
      `SELECT r.id, r.capacity, COUNT(d.id) AS occupied
       FROM rooms r
       LEFT JOIN dut1_records d ON d.room_id = r.id
       WHERE r.gender = $1
       GROUP BY r.id
       HAVING COUNT(d.id) < r.capacity
       ORDER BY r.id ASC
       LIMIT 1`,
      [gender]
    );

    if (!room) {
      return null;
    }

    await tx.run(`UPDATE dut1_records SET room_id = $1, room_assigned_at = NOW() WHERE id = $2`, [room.id, dut1Id]);
    await tx.run(
      `INSERT INTO room_assignment_history (dut1_id, old_room_id, new_room_id, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [dut1Id, null, room.id, changedBy, 'auto_assignment']
    );

    return room.id;
  });
}

async function manualAssignRoom(dut1Id, newRoomId, changedBy) {
  return db.transaction(async (tx) => {
    const record = await tx.get('SELECT room_id, gender FROM dut1_records WHERE id = $1', [dut1Id]);
    if (!record) {
      const err = new Error('Dossier DUT1 introuvable.');
      err.status = 404;
      throw err;
    }

    const room = await tx.get('SELECT * FROM rooms WHERE id = $1', [newRoomId]);
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

    const occupiedRow = await tx.get('SELECT COUNT(*) AS occupied FROM dut1_records WHERE room_id = $1', [newRoomId]);
    if (Number(occupiedRow.occupied) >= room.capacity) {
      const err = new Error('Chambre déjà pleine.');
      err.status = 409;
      throw err;
    }

    await tx.run(`UPDATE dut1_records SET room_id = $1, room_assigned_at = NOW() WHERE id = $2`, [newRoomId, dut1Id]);
    await tx.run(
      `INSERT INTO room_assignment_history (dut1_id, old_room_id, new_room_id, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [dut1Id, record.room_id, newRoomId, changedBy, 'manual_reassignment']
    );

    return newRoomId;
  });
}

module.exports = { autoAssignRoom, manualAssignRoom, roomOccupancy };
