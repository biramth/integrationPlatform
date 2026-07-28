const db = require('../db/database');

function overview(req, res) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM dut1_records').get().n;
  const withRoom = db.prepare('SELECT COUNT(*) AS n FROM dut1_records WHERE room_id IS NOT NULL').get().n;
  const withLuggage = db
    .prepare('SELECT COUNT(DISTINCT dut1_id) AS n FROM luggage_photos')
    .get().n;
  const complementaryDone = db
    .prepare('SELECT COUNT(*) AS n FROM dut1_records WHERE complementary_completed_at IS NOT NULL')
    .get().n;

  res.json({
    total,
    withRoom,
    withoutRoom: total - withRoom,
    withLuggage,
    withoutLuggage: total - withLuggage,
    complementaryDone,
    complementaryPending: total - complementaryDone,
  });
}

function byDepartment(req, res) {
  const rows = db
    .prepare('SELECT department, COUNT(*) AS count FROM dut1_records GROUP BY department ORDER BY department')
    .all();
  res.json({ rows });
}

function byGender(req, res) {
  const rows = db
    .prepare('SELECT gender, COUNT(*) AS count FROM dut1_records GROUP BY gender')
    .all();
  res.json({ rows });
}

function roomsOccupancy(req, res) {
  const rooms = db
    .prepare(
      `SELECT r.id, r.label, r.gender, r.capacity, COUNT(d.id) AS occupied
       FROM rooms r
       LEFT JOIN dut1_records d ON d.room_id = r.id
       GROUP BY r.id
       ORDER BY r.label`
    )
    .all();

  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupied = rooms.reduce((sum, r) => sum + r.occupied, 0);

  res.json({
    rooms,
    totalCapacity,
    totalOccupied,
    occupancyRate: totalCapacity ? Number(((totalOccupied / totalCapacity) * 100).toFixed(1)) : 0,
  });
}

module.exports = { overview, byDepartment, byGender, roomsOccupancy };
