const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// BigInt parser
types.setTypeParser(20, (val) => parseInt(val, 10));

let pool = null;
let useMock = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Erreur sur connexion pool :', err.message);
    });
  } catch (err) {
    console.warn('[AI Studio] Échec de création du pool PostgreSQL — activation du mock :', err.message);
    useMock = true;
  }
} else {
  console.warn('[AI Studio] DATABASE_URL non défini — activation du mock en mémoire.');
  useMock = true;
}

// ==========================================
// MOCK IN-MEMORY DATABASE
// ==========================================
const mockUsers = [
  {
    id: 1,
    full_name: 'Administrateur',
    username: 'admin',
    password_hash: bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123', 10),
    role: 'it',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: true,
    can_reset_platform: true,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    full_name: 'Fatou Ndiaye',
    username: 'orga1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'orga',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    full_name: 'Moussa Diop',
    username: 'orga2',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'orga',
    sub_role: 'logistique',
    is_commission_lead: false,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    full_name: 'Aminata Ba',
    username: 'sante1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'sante',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    full_name: 'Ousmane Fall',
    username: 'cuisine1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'cuisine',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    full_name: 'Khadim Sarr',
    username: 'it1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'it',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: true,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    full_name: 'Astou Diagne',
    username: 'communication1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'communication',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    full_name: 'Ibrahima Kane',
    username: 'culturelle1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'culturelle',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 9,
    full_name: 'Mariama Cissé',
    username: 'presidentielle1',
    password_hash: bcrypt.hashSync('pass123', 10),
    role: 'presidentielle',
    sub_role: null,
    is_commission_lead: true,
    is_pole_lead: false,
    can_reset_platform: false,
    token_version: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockRooms = [
  { id: 1, label: 'A-101', gender: 'F', capacity: 4, building: 'Pavillon A', mattress_count: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, label: 'A-102', gender: 'F', capacity: 4, building: 'Pavillon A', mattress_count: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, label: 'B-101', gender: 'M', capacity: 4, building: 'Pavillon B', mattress_count: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 4, label: 'B-102', gender: 'M', capacity: 4, building: 'Pavillon B', mattress_count: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const mockAllergens = [
  'Gluten (céréales)', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait',
  'Fruits à coque', 'Céleri', 'Moutarde', 'Graines de sésame',
  'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques',
].map((label, idx) => ({ id: idx + 1, label }));

const mockDut1Records = [
  {
    id: 1,
    student_number: '2024-001',
    last_name: 'DIALLO',
    first_name: 'Amadou',
    birth_date: '2005-04-12',
    birth_place: 'Dakar',
    gender: 'M',
    phone_number: '+221771234567',
    department: 'INFO',
    father_name: 'Mamadou Diallo',
    mother_name: 'Awa Ba',
    father_phone: '+221770000001',
    mother_phone: '+221770000002',
    address: 'Grand Yoff, Dakar',
    complementary_completed_at: new Date().toISOString(),
    complementary_completed_by: 4,
    extra_fields_json: '{}',
    room_id: 3,
    room_assigned_at: new Date().toISOString(),
    luggage_count: 2,
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    student_number: '2024-002',
    last_name: 'SOW',
    first_name: 'Aïssatou',
    birth_date: '2005-08-23',
    birth_place: 'Saint-Louis',
    gender: 'F',
    phone_number: '+221772345678',
    department: 'GE',
    father_name: 'Aliou Sow',
    mother_name: 'Fatoumata Sy',
    father_phone: '+221770000003',
    mother_phone: '+221770000004',
    address: 'Sor, Saint-Louis',
    complementary_completed_at: null,
    complementary_completed_by: null,
    extra_fields_json: null,
    room_id: 1,
    room_assigned_at: new Date().toISOString(),
    luggage_count: 1,
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    student_number: '2024-003',
    last_name: 'FALL',
    first_name: 'Cheikh',
    birth_date: '2004-11-05',
    birth_place: 'Thiès',
    gender: 'M',
    phone_number: '+221773456789',
    department: 'GC',
    father_name: 'Ibrahima Fall',
    mother_name: 'Mariama Diop',
    father_phone: '+221770000005',
    mother_phone: '+221770000006',
    address: 'Randoulène, Thiès',
    complementary_completed_at: null,
    complementary_completed_by: null,
    extra_fields_json: null,
    room_id: 3,
    room_assigned_at: new Date().toISOString(),
    luggage_count: 3,
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockLuggageItems = [
  { id: 1, dut1_id: 1, file_path: 'luggage/sample-1.jpg', tag_code: 'LUG-001', is_sensitive: false, room_delivered_at: null, created_at: new Date().toISOString() },
  { id: 2, dut1_id: 1, file_path: 'luggage/sample-2.jpg', tag_code: 'LUG-002', is_sensitive: true, room_delivered_at: null, created_at: new Date().toISOString() },
  { id: 3, dut1_id: 2, file_path: 'luggage/sample-3.jpg', tag_code: 'LUG-003', is_sensitive: false, room_delivered_at: null, created_at: new Date().toISOString() },
];

const mockAdmittedStudents = [
  { id: 1, last_name: 'DIALLO', first_name: 'Amadou', birth_date: '2005-04-12', birth_place: 'Dakar', department: 'INFO', rank: 1, list_type: 'principale', matched_dut1_id: 1, imported_by: 1, imported_at: new Date().toISOString() },
  { id: 2, last_name: 'SOW', first_name: 'Aïssatou', birth_date: '2005-08-23', birth_place: 'Saint-Louis', department: 'GE', rank: 2, list_type: 'principale', matched_dut1_id: 2, imported_by: 1, imported_at: new Date().toISOString() },
  { id: 3, last_name: 'FALL', first_name: 'Cheikh', birth_date: '2004-11-05', birth_place: 'Thiès', department: 'GC', rank: 3, list_type: 'principale', matched_dut1_id: 3, imported_by: 1, imported_at: new Date().toISOString() },
  { id: 4, last_name: 'BA', first_name: 'Oumar', birth_date: '2005-01-15', birth_place: 'Kaolack', department: 'INFO', rank: 4, list_type: 'principale', matched_dut1_id: null, imported_by: 1, imported_at: new Date().toISOString() },
];

const mockActivities = [
  { id: 1, title: 'Cérémonie d\'accueil et installation', description: 'Arrivée des étudiants et remise des clés', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 3600000 * 3).toISOString(), location: 'Amphithéâtre Principal', created_by: 1 },
  { id: 2, title: 'Visite guidée du campus', description: 'Découverte des départements et laboratoires', start_time: new Date(Date.now() + 3600000 * 4).toISOString(), end_time: new Date(Date.now() + 3600000 * 6).toISOString(), location: 'Campus', created_by: 1 },
];

const mockAuditLogs = [];
const mockSettings = {
  registration_open: 'true',
  phase2_open: 'true',
  room_assignment_open: 'true',
};
const mockMedications = [
  { id: 1, name: 'Paracétamol 500mg', stock: 150, unit: 'comprimés', min_threshold: 20 },
  { id: 2, name: 'Ibuprofène 400mg', stock: 80, unit: 'comprimés', min_threshold: 15 },
  { id: 3, name: 'Pansements stériles', stock: 200, unit: 'unités', min_threshold: 50 },
];
const mockTreatments = [];
const mockMeals = [];

function executeMockQuery(text, params = []) {
  const q = text.trim();
  const lower = q.toLowerCase();

  // Users by username
  if (lower.includes('from users') && lower.includes('where username = $1')) {
    const user = mockUsers.find((u) => u.username.toLowerCase() === (params[0] || '').toLowerCase());
    return { rows: user ? [user] : [] };
  }

  // Users by id
  if (lower.includes('from users') && lower.includes('where id = $1')) {
    const user = mockUsers.find((u) => u.id === Number(params[0]));
    return { rows: user ? [user] : [] };
  }

  // All users
  if (lower.startsWith('select') && lower.includes('from users')) {
    return { rows: [...mockUsers] };
  }

  // Rooms
  if (lower.startsWith('select') && lower.includes('from rooms')) {
    if (lower.includes('where id = $1')) {
      const room = mockRooms.find((r) => r.id === Number(params[0]));
      return { rows: room ? [room] : [] };
    }
    // Room stats / counts
    const enrichedRooms = mockRooms.map((r) => {
      const occupants = mockDut1Records.filter((d) => d.room_id === r.id).length;
      return { ...r, occupied_count: occupants, remaining_beds: Math.max(0, r.capacity - occupants) };
    });
    return { rows: enrichedRooms };
  }

  // Allergens
  if (lower.startsWith('select') && lower.includes('from allergens')) {
    return { rows: [...mockAllergens] };
  }

  // Dut1 records
  if (lower.startsWith('select') && lower.includes('from dut1_records')) {
    if (lower.includes('where id = $1') || lower.includes('where d.id = $1')) {
      const rec = mockDut1Records.find((d) => d.id === Number(params[0]));
      if (!rec) return { rows: [] };
      const room = mockRooms.find((r) => r.id === rec.room_id);
      return { rows: [{ ...rec, room_label: room?.label, room_building: room?.building }] };
    }
    return {
      rows: mockDut1Records.map((d) => {
        const room = mockRooms.find((r) => r.id === d.room_id);
        return { ...d, room_label: room?.label, room_building: room?.building };
      }),
    };
  }

  // Luggage items
  if (lower.startsWith('select') && lower.includes('from luggage_items')) {
    if (lower.includes('where dut1_id = $1')) {
      return { rows: mockLuggageItems.filter((l) => l.dut1_id === Number(params[0])) };
    }
    return { rows: [...mockLuggageItems] };
  }

  // Admitted students
  if (lower.startsWith('select') && lower.includes('from admitted_students')) {
    return { rows: [...mockAdmittedStudents] };
  }

  // Activities
  if (lower.startsWith('select') && lower.includes('from activities')) {
    return { rows: [...mockActivities] };
  }

  // Medications
  if (lower.startsWith('select') && lower.includes('from medications')) {
    return { rows: [...mockMedications] };
  }

  // Treatments
  if (lower.startsWith('select') && lower.includes('from treatments')) {
    return { rows: [...mockTreatments] };
  }

  // Meals
  if (lower.startsWith('select') && lower.includes('from meal')) {
    return { rows: [...mockMeals] };
  }

  // Audit logs
  if (lower.startsWith('select') && lower.includes('from audit_logs')) {
    return { rows: [...mockAuditLogs] };
  }

  // Settings
  if (lower.startsWith('select') && lower.includes('from platform_settings')) {
    return { rows: Object.entries(mockSettings).map(([key, value]) => ({ key, value })) };
  }

  // INSERT INTO dut1_records
  if (lower.startsWith('insert into dut1_records')) {
    const newId = mockDut1Records.length + 1;
    const newRecord = {
      id: newId,
      student_number: params[0] || `2024-${String(newId).padStart(3, '0')}`,
      last_name: params[1] || 'Nom',
      first_name: params[2] || 'Prénom',
      birth_date: params[3] || '2005-01-01',
      birth_place: params[4] || 'Dakar',
      gender: params[5] || 'M',
      department: params[6] || 'INFO',
      created_by: params[7] || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDut1Records.push(newRecord);
    return { rowCount: 1, rows: [newRecord] };
  }

  // INSERT INTO audit_logs
  if (lower.startsWith('insert into audit_logs')) {
    mockAuditLogs.push({
      id: mockAuditLogs.length + 1,
      user_id: params[0] || 1,
      action: params[1] || 'action',
      details: params[2] || '{}',
      created_at: new Date().toISOString(),
    });
    return { rowCount: 1, rows: [] };
  }

  // UPDATE users
  if (lower.startsWith('update users')) {
    return { rowCount: 1, rows: [] };
  }

  // UPDATE dut1_records
  if (lower.startsWith('update dut1_records')) {
    return { rowCount: 1, rows: [] };
  }

  // Default fallback for any query
  return { rowCount: 0, rows: [] };
}

async function get(text, params = []) {
  if (pool && !useMock) {
    try {
      const result = await pool.query(text, params);
      return result.rows[0];
    } catch (err) {
      console.warn('[PostgreSQL get fallback to mock]:', err.message);
      useMock = true;
    }
  }
  const result = executeMockQuery(text, params);
  return result.rows[0];
}

async function all(text, params = []) {
  if (pool && !useMock) {
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } catch (err) {
      console.warn('[PostgreSQL all fallback to mock]:', err.message);
      useMock = true;
    }
  }
  const result = executeMockQuery(text, params);
  return result.rows;
}

async function run(text, params = []) {
  if (pool && !useMock) {
    try {
      const result = await pool.query(text, params);
      return { changes: result.rowCount, rows: result.rows };
    } catch (err) {
      console.warn('[PostgreSQL run fallback to mock]:', err.message);
      useMock = true;
    }
  }
  const result = executeMockQuery(text, params);
  return { changes: result.rowCount || 1, rows: result.rows };
}

async function transaction(fn) {
  if (pool && !useMock) {
    try {
      const client = await pool.connect();
      const scoped = {
        get: async (text, params = []) => (await client.query(text, params)).rows[0],
        all: async (text, params = []) => (await client.query(text, params)).rows,
        run: async (text, params = []) => {
          const result = await client.query(text, params);
          return { changes: result.rowCount, rows: result.rows };
        },
      };

      try {
        await client.query('BEGIN');
        const value = await fn(scoped);
        await client.query('COMMIT');
        return value;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('[PostgreSQL transaction fallback to mock]:', err.message);
      useMock = true;
    }
  }

  // Mock transaction
  const scopedMock = {
    get,
    all,
    run,
  };
  return fn(scopedMock);
}

module.exports = { pool, get, all, run, transaction };
