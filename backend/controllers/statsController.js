const db = require('../db/database');

async function overview(req, res) {
  const total = Number((await db.get('SELECT COUNT(*) AS n FROM dut1_records')).n);
  const withRoom = Number((await db.get('SELECT COUNT(*) AS n FROM dut1_records WHERE room_id IS NOT NULL')).n);
  const withLuggage = Number(
    (
      await db.get(
        `SELECT COUNT(*) AS n FROM dut1_records d
         WHERE d.luggage_count IS NOT NULL
           AND (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) >= d.luggage_count`
      )
    ).n
  );
  const complementaryDone = Number(
    (await db.get('SELECT COUNT(*) AS n FROM dut1_records WHERE complementary_completed_at IS NOT NULL')).n
  );
  const activeRestrictions = Number(
    (await db.get('SELECT COUNT(*) AS n FROM health_restrictions WHERE resolved_at IS NULL')).n
  );

  res.json({
    total,
    withRoom,
    withoutRoom: total - withRoom,
    withLuggage,
    withoutLuggage: total - withLuggage,
    complementaryDone,
    complementaryPending: total - complementaryDone,
    activeRestrictions,
  });
}

async function byDepartment(req, res) {
  const rows = await db.all(
    'SELECT department, COUNT(*) AS count FROM dut1_records GROUP BY department ORDER BY department'
  );
  res.json({ rows: rows.map((r) => ({ ...r, count: Number(r.count) })) });
}

async function byGender(req, res) {
  const rows = await db.all('SELECT gender, COUNT(*) AS count FROM dut1_records GROUP BY gender');
  res.json({ rows: rows.map((r) => ({ ...r, count: Number(r.count) })) });
}

async function roomsOccupancy(req, res) {
  const rooms = await db.all(
    `SELECT r.id, r.label, r.gender, r.capacity, COUNT(d.id) AS occupied
     FROM rooms r
     LEFT JOIN dut1_records d ON d.room_id = r.id
     GROUP BY r.id
     ORDER BY r.label`
  );

  const normalized = rooms.map((r) => ({
    ...r,
    occupied: Number(r.occupied),
    overloaded: Number(r.occupied) > r.capacity,
  }));
  const totalCapacity = normalized.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupied = normalized.reduce((sum, r) => sum + r.occupied, 0);
  const overloadedCount = normalized.filter((r) => r.overloaded).length;

  res.json({
    rooms: normalized,
    totalCapacity,
    totalOccupied,
    overloadedCount,
    occupancyRate: totalCapacity ? Number(((totalOccupied / totalCapacity) * 100).toFixed(1)) : 0,
  });
}

async function illnessTrend(req, res) {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const rows = await db.all(
    `SELECT start_date AS date, COUNT(*) AS count
     FROM health_restrictions
     WHERE start_date >= to_char(CURRENT_DATE - $1 * INTERVAL '1 day', 'YYYY-MM-DD')
     GROUP BY start_date
     ORDER BY start_date ASC`,
    [days]
  );
  res.json({ rows: rows.map((r) => ({ ...r, count: Number(r.count) })) });
}

async function allergyPrevalence(req, res) {
  const rows = await db.all(
    `SELECT a.id, a.label, COUNT(da.dut1_id) AS count
     FROM allergens a
     LEFT JOIN dut1_allergens da ON da.allergen_id = a.id
     GROUP BY a.id
     ORDER BY count DESC, a.label`
  );
  res.json({ rows: rows.map((r) => ({ ...r, count: Number(r.count) })) });
}

// Tableau de bord santé : stats exclusivement médicales, séparées des stats
// générales (overview) réservées à Orga/Présidentielle.
async function healthOverview(req, res) {
  const total = Number((await db.get('SELECT COUNT(*) AS n FROM dut1_records')).n);
  const complementaryDone = Number(
    (await db.get('SELECT COUNT(*) AS n FROM dut1_records WHERE complementary_completed_at IS NOT NULL')).n
  );
  const activeRestrictions = Number(
    (await db.get('SELECT COUNT(*) AS n FROM health_restrictions WHERE resolved_at IS NULL')).n
  );
  const onTreatment = Number(
    (await db.get('SELECT COUNT(*) AS n FROM dut1_records WHERE on_treatment = TRUE')).n
  );
  const withAllergies = Number(
    (await db.get('SELECT COUNT(DISTINCT dut1_id) AS n FROM dut1_allergens')).n
  );
  const totalAllergens = Number(
    (await db.get('SELECT COUNT(*) AS n FROM allergens')).n
  );
  const activeTreatments = Number(
    (
      await db.get(
        `SELECT COUNT(*) AS n FROM dut1_treatments
         WHERE start_date <= CURRENT_DATE
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)`
      )
    ).n
  );

  res.json({
    total,
    complementaryDone,
    complementaryPending: total - complementaryDone,
    activeRestrictions,
    onTreatment,
    activeTreatments,
    withAllergies,
    totalAllergens,
  });
}

module.exports = {
  overview,
  healthOverview,
  byDepartment,
  byGender,
  roomsOccupancy,
  illnessTrend,
  allergyPrevalence,
};
