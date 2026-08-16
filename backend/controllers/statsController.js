const db = require('../db/database');

function overview(req, res) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM dut1_records').get().n;
  const withRoom = db.prepare('SELECT COUNT(*) AS n FROM dut1_records WHERE room_id IS NOT NULL').get().n;
  const withLuggage = db
    .prepare(
      `SELECT COUNT(*) AS n FROM dut1_records d
       WHERE d.luggage_count IS NOT NULL
         AND (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) >= d.luggage_count`
    )
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

function illnessTrend(req, res) {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const rows = db
    .prepare(
      `SELECT illness_date AS date, COUNT(*) AS count
       FROM illness_records
       WHERE illness_date >= date('now', '-' || @days || ' days')
       GROUP BY illness_date
       ORDER BY illness_date ASC`
    )
    .all({ days });
  res.json({ rows });
}

function allergyPrevalence(req, res) {
  const rows = db
    .prepare(
      `SELECT a.id, a.label, COUNT(da.dut1_id) AS count
       FROM allergens a
       LEFT JOIN dut1_allergens da ON da.allergen_id = a.id
       GROUP BY a.id
       ORDER BY count DESC, a.label`
    )
    .all();
  res.json({ rows });
}

function completionByDepartment(req, res) {
  const rows = db
    .prepare(
      `SELECT department,
              COUNT(*) AS total,
              SUM(CASE WHEN complementary_completed_at IS NOT NULL THEN 1 ELSE 0 END) AS completed
       FROM dut1_records
       GROUP BY department
       ORDER BY department`
    )
    .all();

  res.json({
    rows: rows.map((r) => ({
      ...r,
      rate: r.total ? Number(((r.completed / r.total) * 100).toFixed(1)) : 0,
    })),
  });
}

module.exports = {
  overview,
  byDepartment,
  byGender,
  roomsOccupancy,
  illnessTrend,
  allergyPrevalence,
  completionByDepartment,
};
