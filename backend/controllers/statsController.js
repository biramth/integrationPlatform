const db = require('../db/database');

// Les compteurs d'un même tableau de bord sont calculés en UNE requête : cinq
// (ou sept) COUNT séparés coûtaient autant d'allers-retours Supabase (~125 ms
// chacun depuis Render) pour les mêmes données. Les sous-requêtes non corrélées
// sont évaluées une seule fois par Postgres, et tout est lu au même instant —
// plus de valeurs incohérentes entre elles pendant une écriture concurrente.
async function overview(req, res) {
  const row = await db.get(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE d.room_id IS NOT NULL) AS with_room,
       COUNT(*) FILTER (
         WHERE d.luggage_count IS NOT NULL
           AND (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) >= d.luggage_count
       ) AS with_luggage,
       COUNT(*) FILTER (WHERE d.complementary_completed_at IS NOT NULL) AS complementary_done,
       (SELECT COUNT(*) FROM health_restrictions WHERE resolved_at IS NULL) AS active_restrictions
     FROM dut1_records d`
  );

  const total = Number(row.total);
  const withRoom = Number(row.with_room);
  const withLuggage = Number(row.with_luggage);
  const complementaryDone = Number(row.complementary_done);

  res.json({
    total,
    withRoom,
    withoutRoom: total - withRoom,
    withLuggage,
    withoutLuggage: total - withLuggage,
    complementaryDone,
    complementaryPending: total - complementaryDone,
    activeRestrictions: Number(row.active_restrictions),
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
  const row = await db.get(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE d.complementary_completed_at IS NOT NULL) AS complementary_done,
       (SELECT COUNT(*) FROM health_restrictions WHERE resolved_at IS NULL) AS active_restrictions,
       COUNT(*) FILTER (WHERE d.on_treatment = TRUE) AS on_treatment,
       (SELECT COUNT(DISTINCT dut1_id) FROM dut1_allergens) AS with_allergies,
       (SELECT COUNT(*) FROM allergens) AS total_allergens,
       (SELECT COUNT(*) FROM dut1_treatments
         WHERE start_date <= CURRENT_DATE
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)) AS active_treatments
     FROM dut1_records d`
  );

  const total = Number(row.total);
  const complementaryDone = Number(row.complementary_done);

  res.json({
    total,
    complementaryDone,
    complementaryPending: total - complementaryDone,
    activeRestrictions: Number(row.active_restrictions),
    onTreatment: Number(row.on_treatment),
    activeTreatments: Number(row.active_treatments),
    withAllergies: Number(row.with_allergies),
    totalAllergens: Number(row.total_allergens),
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
