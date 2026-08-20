const db = require('../db/database');

async function roomOccupancy(roomId) {
  const row = await db.get('SELECT COUNT(*) AS occupied FROM dut1_records WHERE room_id = $1', [roomId]);
  return Number(row.occupied);
}

// Verrouille toutes les chambres du genre concerné (SELECT ... FOR UPDATE) avant
// de calculer l'occupation : sans ça, deux enregistrements simultanés (plusieurs
// agents Orga au bureau d'accueil en même temps) peuvent lire la même occupation
// "3/4" avant que l'un des deux ne commite, et assigner tous les deux la même
// place — la chambre se retrouve à 5/4. Le verrou force les transactions
// concurrentes à s'exécuter l'une après l'autre pour ce genre, chacune relisant
// une occupation à jour avant de choisir une chambre.
async function autoAssignRoom(dut1Id, gender, changedBy) {
  return db.transaction(async (tx) => {
    const rooms = await tx.all(
      `SELECT id, capacity FROM rooms WHERE gender = $1 ORDER BY id ASC FOR UPDATE`,
      [gender]
    );

    for (const room of rooms) {
      const occupiedRow = await tx.get('SELECT COUNT(*) AS occupied FROM dut1_records WHERE room_id = $1', [room.id]);
      if (Number(occupiedRow.occupied) >= room.capacity) continue;

      await tx.run(`UPDATE dut1_records SET room_id = $1, room_assigned_at = NOW() WHERE id = $2`, [room.id, dut1Id]);
      await tx.run(
        `INSERT INTO room_assignment_history (dut1_id, old_room_id, new_room_id, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [dut1Id, null, room.id, changedBy, 'auto_assignment']
      );

      return room.id;
    }

    return null;
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

    // FOR UPDATE : verrouille la chambre cible pendant le contrôle de capacité,
    // pour la même raison que dans autoAssignRoom ci-dessus (éviter que deux
    // réassignations manuelles concurrentes vers la même chambre ne la
    // dépassent toutes les deux sa capacité).
    const room = await tx.get('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [newRoomId]);
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

async function getHistoryForDut1(dut1Id) {
  return db.all(
    `SELECT h.*, ro.label AS old_room_label, rn.label AS new_room_label, u.full_name AS changed_by_name
     FROM room_assignment_history h
     LEFT JOIN rooms ro ON ro.id = h.old_room_id
     LEFT JOIN rooms rn ON rn.id = h.new_room_id
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.dut1_id = $1
     ORDER BY h.changed_at DESC`,
    [dut1Id]
  );
}

async function getHistoryForRoom(roomId) {
  return db.all(
    `SELECT h.*, d.first_name, d.last_name,
       ro.label AS old_room_label, rn.label AS new_room_label, u.full_name AS changed_by_name
     FROM room_assignment_history h
     JOIN dut1_records d ON d.id = h.dut1_id
     LEFT JOIN rooms ro ON ro.id = h.old_room_id
     LEFT JOIN rooms rn ON rn.id = h.new_room_id
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.old_room_id = $1 OR h.new_room_id = $1
     ORDER BY h.changed_at DESC`,
    [roomId]
  );
}

module.exports = { autoAssignRoom, manualAssignRoom, roomOccupancy, getHistoryForDut1, getHistoryForRoom };
