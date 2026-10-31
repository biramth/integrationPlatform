const bcrypt = require('bcryptjs');
require('dotenv').config();

let pgPool = null;
let usePg = false;

if (process.env.DATABASE_URL) {
  try {
    const { Pool, types } = require('pg');
    types.setTypeParser(20, (val) => parseInt(val, 10));
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pgPool.on('error', (err) => {
      console.error('[db] Erreur sur connexion PostgreSQL :', err.message);
    });
    usePg = true;
    console.log('[AI Studio] Connexion PostgreSQL configurée.');
  } catch (err) {
    console.warn('[AI Studio] Échec initialisation pg pool, bascule sur mock en mémoire :', err.message);
    usePg = false;
  }
} else {
  console.log('[AI Studio] DATABASE_URL non défini — base de données en mémoire active (mock).');
}

// -----------------------------------------------------------------------------
// In-Memory Database Store for development & demo
// -----------------------------------------------------------------------------
const hashPasswordSync = (plain) => bcrypt.hashSync(plain, 10);

const adminHash = hashPasswordSync(process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123');
const pass123Hash = hashPasswordSync('pass123');

const memory = {
  users: [
    {
      id: 1,
      full_name: 'Administrateur',
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      password_hash: adminHash,
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
      id: 2,
      full_name: 'Fatou Ndiaye',
      username: 'orga1',
      password_hash: pass123Hash,
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
      password_hash: pass123Hash,
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
      password_hash: pass123Hash,
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
      password_hash: pass123Hash,
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
      password_hash: pass123Hash,
      role: 'it',
      sub_role: null,
      is_commission_lead: false,
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
      password_hash: pass123Hash,
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
      password_hash: pass123Hash,
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
      password_hash: pass123Hash,
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
    {
      id: 10,
      full_name: 'Mamadou Diallo',
      username: 'dreudj1',
      password_hash: pass123Hash,
      role: 'dreudj',
      sub_role: null,
      is_commission_lead: true,
      is_pole_lead: false,
      can_reset_platform: false,
      token_version: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  rooms: [
    { id: 1, label: 'A-101', gender: 'F', capacity: 4, building: 'Pavillon A', mattress_count: 4 },
    { id: 2, label: 'A-102', gender: 'F', capacity: 4, building: 'Pavillon A', mattress_count: 4 },
    { id: 3, label: 'B-101', gender: 'M', capacity: 4, building: 'Pavillon B', mattress_count: 4 },
    { id: 4, label: 'B-102', gender: 'M', capacity: 4, building: 'Pavillon B', mattress_count: 4 },
  ],
  allergens: [
    { id: 1, label: 'Gluten (céréales)' },
    { id: 2, label: 'Crustacés' },
    { id: 3, label: 'Œufs' },
    { id: 4, label: 'Poissons' },
    { id: 5, label: 'Arachides' },
    { id: 6, label: 'Soja' },
    { id: 7, label: 'Lait' },
    { id: 8, label: 'Fruits à coque' },
    { id: 9, label: 'Céleri' },
    { id: 10, label: 'Moutarde' },
    { id: 11, label: 'Graines de sésame' },
    { id: 12, label: 'Anhydride sulfureux et sulfites' },
    { id: 13, label: 'Lupin' },
    { id: 14, label: 'Mollusques' },
  ],
  platform_settings: {
    registration: true,
    luggage: true,
    logistics: true,
    phase2: true,
  },
  activities: [
    {
      id: 1,
      name: 'Accueil & Installation des promotions',
      activity_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      start_time: '08:00',
      description: 'Accueil des étudiants DUT1, formalités, attribution des chambres et dépôt des bagages.',
      created_by: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Cérémonie d’Ouverture & Présentation des départements',
      activity_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      end_date: null,
      start_time: '09:30',
      description: 'Discours des responsables pédagogiques, parrainages et visite guidée.',
      created_by: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: 'Activités sportives & Tournoi inter-départements',
      activity_date: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
      end_date: null,
      start_time: '15:00',
      description: 'Épreuves d’athlétisme, football et animations de cohésion.',
      created_by: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      name: 'Grande Soirée Culturelle & Gala d’Intégration',
      activity_date: new Date(Date.now() + 259200000).toISOString().slice(0, 10),
      end_date: null,
      start_time: '20:00',
      description: 'Spectacles, danses traditionnelles, buffet et animation musicale.',
      created_by: 1,
      created_at: new Date().toISOString(),
    },
  ],
  phase2_questions: [
    { id: 1, field_key: 'on_treatment', label: 'Traitement médical en cours ?', type: 'traitement_medical', required: true, position: -20 },
    { id: 2, field_key: 'allergies', label: 'Allergies', type: 'allergies', required: false, position: -10 },
    { id: 3, field_key: 'aptitude_criteria', label: "Critères d'aptitude", type: 'aptitude', required: true, position: -5 },
    { id: 4, field_key: 'personnalite', label: 'Traits de personnalité', type: 'texte_long', required: false, position: 0 },
    { id: 5, field_key: 'remarques', label: 'Remarques diverses', type: 'texte_long', required: false, position: 1 },
  ],
  aptitude_criteria: [
    { id: 1, label: 'Endurance physique' },
    { id: 2, label: 'Natation' },
  ],
  aptitude_criterion_levels: [
    { id: 1, criterion_id: 1, label: 'Pas sportif', rank: 0 },
    { id: 2, criterion_id: 1, label: 'Peu sportif', rank: 1 },
    { id: 3, criterion_id: 1, label: 'Sportif', rank: 2 },
    { id: 4, criterion_id: 1, label: 'Très sportif', rank: 3 },
    { id: 5, criterion_id: 2, label: 'Ne sait pas nager', rank: 0 },
    { id: 6, criterion_id: 2, label: 'Débutant', rank: 1 },
    { id: 7, criterion_id: 2, label: 'Nageur', rank: 2 },
  ],
  medications: [
    { id: 1, name: 'Paracétamol 500mg', unit: 'comprimé(s)', reference_stock: 100, current_stock: 75, alert_threshold_percent: 20 },
    { id: 2, name: 'Ibuprofène 400mg', unit: 'comprimé(s)', reference_stock: 50, current_stock: 35, alert_threshold_percent: 20 },
    { id: 3, name: 'Antihistaminique (Cétirizine)', unit: 'comprimé(s)', reference_stock: 40, current_stock: 28, alert_threshold_percent: 20 },
    { id: 4, name: 'Pansements stériles', unit: 'boîte(s)', reference_stock: 20, current_stock: 15, alert_threshold_percent: 20 },
  ],
  medication_movements: [],
  admitted_students: [
    { id: 1, last_name: 'SARR', first_name: 'Cheikh', birth_date: '2005-04-12', birth_place: 'Dakar', department: 'INFO', rank: 1, list_type: 'principale', phone_number: '+221771234567', emergency_contacts_json: JSON.stringify([{ name: 'Papa Sarr', phone: '+221778901234' }]), matched_dut1_id: 1 },
    { id: 2, last_name: 'DIOP', first_name: 'Awa', birth_date: '2005-08-25', birth_place: 'Saint-Louis', department: 'INFO', rank: 2, list_type: 'principale', phone_number: '+221772345678', emergency_contacts_json: JSON.stringify([{ name: 'Maman Diop', phone: '+221779012345' }]), matched_dut1_id: 2 },
    { id: 3, last_name: 'NDIAYE', first_name: 'Omar', birth_date: '2004-11-03', birth_place: 'Thiès', department: 'GC', rank: 1, list_type: 'principale', phone_number: '+221773456789', emergency_contacts_json: null, matched_dut1_id: 3 },
    { id: 4, last_name: 'FALL', first_name: 'Mariama', birth_date: '2005-02-17', birth_place: 'Ziguinchor', department: 'GE', rank: 1, list_type: 'principale', phone_number: '+221774567890', emergency_contacts_json: null, matched_dut1_id: 4 },
    { id: 5, last_name: 'CISSE', first_name: 'Boubacar', birth_date: '2005-06-30', birth_place: 'Kaolack', department: 'ITR', rank: 1, list_type: 'principale', phone_number: '+221775678901', emergency_contacts_json: null, matched_dut1_id: null },
    { id: 6, last_name: 'KANE', first_name: 'Fatoumata', birth_date: '2004-09-14', birth_place: 'Tambacounda', department: 'Gestion', rank: 1, list_type: 'attente', phone_number: '+221776789012', emergency_contacts_json: null, matched_dut1_id: null },
  ],
  dut1_records: [
    {
      id: 1,
      student_number: 'DUT1-2026-001',
      last_name: 'SARR',
      first_name: 'Cheikh',
      birth_date: '2005-04-12',
      birth_place: 'Dakar',
      gender: 'M',
      phone_number: '+221771234567',
      department: 'INFO',
      address: 'Fann Résidence, Dakar',
      room_id: 3,
      room_assigned_at: new Date().toISOString(),
      luggage_count: 2,
      luggage_picked_up_at: new Date().toISOString(),
      luggage_delivered_at: new Date().toISOString(),
      complementary_completed_at: new Date().toISOString(),
      complementary_completed_by: 4,
      on_treatment: false,
      treatment_details: null,
      emergency_contacts_json: JSON.stringify([{ name: 'Papa Sarr', phone: '+221778901234' }]),
      created_by: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      student_number: 'DUT1-2026-002',
      last_name: 'DIOP',
      first_name: 'Awa',
      birth_date: '2005-08-25',
      birth_place: 'Saint-Louis',
      gender: 'F',
      phone_number: '+221772345678',
      department: 'INFO',
      address: 'Sor, Saint-Louis',
      room_id: 1,
      room_assigned_at: new Date().toISOString(),
      luggage_count: 1,
      luggage_picked_up_at: new Date().toISOString(),
      luggage_delivered_at: null,
      complementary_completed_at: new Date().toISOString(),
      complementary_completed_by: 4,
      on_treatment: true,
      treatment_details: 'Ventoline en cas de crise d’asthme',
      emergency_contacts_json: JSON.stringify([{ name: 'Maman Diop', phone: '+221779012345' }]),
      created_by: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      student_number: 'DUT1-2026-003',
      last_name: 'NDIAYE',
      first_name: 'Omar',
      birth_date: '2004-11-03',
      birth_place: 'Thiès',
      gender: 'M',
      phone_number: '+221773456789',
      department: 'GC',
      address: 'Dixième, Thiès',
      room_id: 3,
      room_assigned_at: new Date().toISOString(),
      luggage_count: 2,
      luggage_picked_up_at: null,
      luggage_delivered_at: null,
      complementary_completed_at: null,
      complementary_completed_by: null,
      on_treatment: false,
      treatment_details: null,
      emergency_contacts_json: JSON.stringify([{ name: 'Oncle Ndiaye', phone: '+221770001122' }]),
      created_by: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 4,
      student_number: 'DUT1-2026-004',
      last_name: 'FALL',
      first_name: 'Mariama',
      birth_date: '2005-02-17',
      birth_place: 'Ziguinchor',
      gender: 'F',
      phone_number: '+221774567890',
      department: 'GE',
      address: 'Boucotte, Ziguinchor',
      room_id: 1,
      room_assigned_at: new Date().toISOString(),
      luggage_count: 1,
      luggage_picked_up_at: null,
      luggage_delivered_at: null,
      complementary_completed_at: null,
      complementary_completed_by: null,
      on_treatment: false,
      treatment_details: null,
      emergency_contacts_json: null,
      created_by: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  luggage_items: [
    { id: 1, dut1_id: 1, file_path: '1/valise1.jpg', original_name: 'valise_rouge.jpg', is_sensitive: false, sensitive_note: null, uploaded_by: 2, uploaded_at: new Date().toISOString() },
    { id: 2, dut1_id: 1, file_path: '1/sac1.jpg', original_name: 'sac_a_dos.jpg', is_sensitive: true, sensitive_note: 'Ordinateur portable et documents', uploaded_by: 2, uploaded_at: new Date().toISOString() },
    { id: 3, dut1_id: 2, file_path: '2/valise1.jpg', original_name: 'valise_noire.jpg', is_sensitive: false, sensitive_note: null, uploaded_by: 2, uploaded_at: new Date().toISOString() },
  ],
  dut1_allergens: [
    { dut1_id: 2, allergen_id: 5, severity: 'severe' }, // Arachides
  ],
  health_restrictions: [
    { id: 1, dut1_id: 2, activity_id: 3, start_date: new Date().toISOString().slice(0, 10), end_date: null, reason: 'Asthme d’effort modéré', declared_by: 4, resolved_at: null, created_at: new Date().toISOString() },
  ],
  dut1_treatments: [
    { id: 1, dut1_id: 2, medication_id: null, medication_label: 'Ventoline inhalateur', dosage: '1 bouffée si besoin', slot_matin: true, slot_midi: false, slot_soir: true, start_date: new Date().toISOString().slice(0, 10), end_date: null, notes: 'Traitement asthme', ended_at: null, source_phase2: true, created_by: 4, created_at: new Date().toISOString() },
  ],
  treatment_intakes: [],
  dut1_aptitude_levels: [
    { dut1_id: 1, criterion_id: 1, level_id: 3 },
    { dut1_id: 1, criterion_id: 2, level_id: 7 },
    { dut1_id: 2, criterion_id: 1, level_id: 2 },
  ],
  activity_required_criteria: [
    { activity_id: 3, criterion_id: 1, min_level_id: 2 },
  ],
  meal_services: [
    { id: 1, service_date: new Date().toISOString().slice(0, 10), meal_type: 'dejeuner', created_by: 5, created_at: new Date().toISOString() },
    { id: 2, service_date: new Date().toISOString().slice(0, 10), meal_type: 'diner', created_by: 5, created_at: new Date().toISOString() },
  ],
  dishes: [
    { id: 1, meal_service_id: 1, name: 'Thiéboudienne Penda Mbaye (Riz au poisson rouge)', created_by: 5, created_at: new Date().toISOString() },
    { id: 2, meal_service_id: 1, name: 'Salade de crudités de saison', created_by: 5, created_at: new Date().toISOString() },
    { id: 3, meal_service_id: 2, name: 'Yassa Poulet au citron vert & riz blanc', created_by: 5, created_at: new Date().toISOString() },
  ],
  dish_allergens: [
    { dish_id: 1, allergen_id: 4 }, // Poissons
  ],
  audit_logs: [
    {
      id: 1,
      actor_id: 1,
      actor_snapshot: { id: 1, fullName: 'Administrateur', username: 'admin', role: 'it' },
      action: 'platform.init',
      resource_type: 'platform',
      resource_id: '1',
      resource_label: 'Initialisation de la plateforme',
      commission: 'it',
      success: true,
      created_at: new Date().toISOString(),
    },
  ],
  room_assignment_history: [],
};

let nextId = 100;

// Execute simulated SQL query on in-memory store
async function mockQuery(sql, params = []) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();

  // 1. SELECT users
  if (lower.includes('from users')) {
    if (lower.includes('where username = $1') || lower.includes('where username=')) {
      const u = memory.users.find((x) => x.username.toLowerCase() === String(params[0]).toLowerCase());
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }
    if (lower.includes('where id = $1') || lower.includes('where id=')) {
      const u = memory.users.find((x) => String(x.id) === String(params[0]));
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }
    // list users
    let result = [...memory.users];
    if (lower.includes('role = $1') || (lower.includes('role =') && params[0])) {
      result = result.filter((x) => x.role === params[0]);
    }
    return { rows: result, rowCount: result.length };
  }

  // 2. UPDATE users
  if (lower.startsWith('update users')) {
    if (lower.includes('password_hash = $1') && lower.includes('where id = $2')) {
      const u = memory.users.find((x) => String(x.id) === String(params[1]));
      if (u) {
        u.password_hash = params[0];
        u.token_version = (u.token_version || 0) + 1;
        u.updated_at = new Date().toISOString();
      }
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }
    if (lower.includes('token_version = token_version + 1')) {
      const u = memory.users.find((x) => String(x.id) === String(params[params.length - 1]));
      if (u) u.token_version = (u.token_version || 0) + 1;
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }
    return { rows: [], rowCount: 1 };
  }

  // 3. INSERT INTO users
  if (lower.startsWith('insert into users')) {
    const newUser = {
      id: ++nextId,
      full_name: params[0] || 'Nouvel Agent',
      username: params[1] || `agent${nextId}`,
      password_hash: params[2] || pass123Hash,
      role: params[3] || 'orga',
      sub_role: params[4] || null,
      is_commission_lead: Boolean(params[5]),
      is_pole_lead: false,
      can_reset_platform: Boolean(params[6]),
      token_version: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memory.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 4. platform_settings
  if (lower.includes('platform_settings')) {
    if (lower.startsWith('select enabled from platform_settings where key = $1')) {
      const key = params[0];
      const val = memory.platform_settings[key] ?? true;
      return { rows: [{ enabled: val }], rowCount: 1 };
    }
    if (lower.startsWith('select key, enabled from platform_settings')) {
      const rows = Object.entries(memory.platform_settings).map(([k, v]) => ({ key: k, enabled: v }));
      return { rows, rowCount: rows.length };
    }
    if (lower.startsWith('insert into platform_settings') || lower.startsWith('update platform_settings')) {
      const key = params[0];
      const enabled = params[1];
      memory.platform_settings[key] = Boolean(enabled);
      return { rows: [], rowCount: 1 };
    }
  }

  // 5. rooms
  if (lower.includes('from rooms')) {
    if (lower.includes('where id = $1')) {
      const r = memory.rooms.find((x) => String(x.id) === String(params[0]));
      return { rows: r ? [r] : [], rowCount: r ? 1 : 0 };
    }
    if (lower.includes('where r.gender = $1') || lower.includes('gender = $1')) {
      const g = params[0];
      const rooms = memory.rooms
        .filter((r) => r.gender === g)
        .map((r) => {
          const occ = memory.dut1_records.filter((d) => d.room_id === r.id);
          return {
            ...r,
            occupied: occ.length,
            departments_json: JSON.stringify([]),
          };
        });
      return { rows: rooms, rowCount: rooms.length };
    }
    // list rooms with aggregation
    const rooms = memory.rooms.map((r) => {
      const occ = memory.dut1_records.filter((d) => d.room_id === r.id);
      const depMap = {};
      for (const d of occ) {
        depMap[d.department] = (depMap[d.department] || 0) + 1;
      }
      const departments = Object.entries(depMap).map(([dep, count]) => ({ department: dep, count }));
      return {
        ...r,
        occupied: occ.length,
        departments_json: JSON.stringify(departments),
      };
    });
    return { rows: rooms, rowCount: rooms.length };
  }

  // 6. allergens
  if (lower.includes('from allergens')) {
    if (lower.includes('where id = $1')) {
      const a = memory.allergens.find((x) => String(x.id) === String(params[0]));
      return { rows: a ? [a] : [], rowCount: a ? 1 : 0 };
    }
    return { rows: [...memory.allergens], rowCount: memory.allergens.length };
  }

  // 7. activities
  if (lower.includes('from activities')) {
    if (lower.includes('where id = $1')) {
      const act = memory.activities.find((x) => String(x.id) === String(params[0]));
      return { rows: act ? [act] : [], rowCount: act ? 1 : 0 };
    }
    return { rows: [...memory.activities], rowCount: memory.activities.length };
  }

  // 8. dut1_records
  if (lower.includes('from dut1_records')) {
    if (lower.includes('where id = $1') || lower.includes('where d.id = $1')) {
      const d = memory.dut1_records.find((x) => String(x.id) === String(params[0]));
      return { rows: d ? [d] : [], rowCount: d ? 1 : 0 };
    }
    if (lower.includes('where student_number = $1')) {
      const d = memory.dut1_records.find((x) => x.student_number === params[0]);
      return { rows: d ? [d] : [], rowCount: d ? 1 : 0 };
    }
    if (lower.includes('count(*) filter') || lower.includes('count(*) as total')) {
      // overview stats
      const total = memory.dut1_records.length;
      const with_room = memory.dut1_records.filter((d) => d.room_id != null).length;
      const with_luggage = memory.dut1_records.filter((d) => (d.luggage_count || 0) > 0).length;
      const complementary_done = memory.dut1_records.filter((d) => d.complementary_completed_at != null).length;
      const active_restrictions = memory.health_restrictions.filter((h) => !h.resolved_at).length;
      const on_treatment = memory.dut1_records.filter((d) => d.on_treatment).length;
      const with_allergies = new Set(memory.dut1_allergens.map((x) => x.dut1_id)).size;
      const total_allergens = memory.allergens.length;
      const active_treatments = memory.dut1_treatments.filter((t) => !t.ended_at).length;

      return {
        rows: [
          {
            total,
            with_room,
            with_luggage,
            complementary_done,
            active_restrictions,
            on_treatment,
            with_allergies,
            total_allergens,
            active_treatments,
          },
        ],
        rowCount: 1,
      };
    }
    if (lower.includes('group by department')) {
      const counts = {};
      for (const d of memory.dut1_records) {
        counts[d.department] = (counts[d.department] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([department, count]) => ({ department, count }));
      return { rows, rowCount: rows.length };
    }
    if (lower.includes('group by gender')) {
      const counts = {};
      for (const d of memory.dut1_records) {
        counts[d.gender] = (counts[d.gender] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([gender, count]) => ({ gender, count }));
      return { rows, rowCount: rows.length };
    }
    return { rows: [...memory.dut1_records], rowCount: memory.dut1_records.length };
  }

  // 9. admitted_students
  if (lower.includes('from admitted_students')) {
    if (lower.includes('where id = $1')) {
      const a = memory.admitted_students.find((x) => String(x.id) === String(params[0]));
      return { rows: a ? [a] : [], rowCount: a ? 1 : 0 };
    }
    return { rows: [...memory.admitted_students], rowCount: memory.admitted_students.length };
  }

  // 10. phase2_questions
  if (lower.includes('from phase2_questions')) {
    return { rows: [...memory.phase2_questions], rowCount: memory.phase2_questions.length };
  }

  // 11. aptitude_criteria
  if (lower.includes('from aptitude_criteria')) {
    return { rows: [...memory.aptitude_criteria], rowCount: memory.aptitude_criteria.length };
  }
  if (lower.includes('from aptitude_criterion_levels')) {
    return { rows: [...memory.aptitude_criterion_levels], rowCount: memory.aptitude_criterion_levels.length };
  }

  // 12. medications
  if (lower.includes('from medications')) {
    if (lower.includes('where id = $1')) {
      const m = memory.medications.find((x) => String(x.id) === String(params[0]));
      return { rows: m ? [m] : [], rowCount: m ? 1 : 0 };
    }
    return { rows: [...memory.medications], rowCount: memory.medications.length };
  }

  // 13. meal_services & dishes
  if (lower.includes('from meal_services')) {
    return { rows: [...memory.meal_services], rowCount: memory.meal_services.length };
  }
  if (lower.includes('from dishes')) {
    return { rows: [...memory.dishes], rowCount: memory.dishes.length };
  }

  // 14. audit_logs
  if (lower.includes('from audit_logs')) {
    return { rows: [...memory.audit_logs], rowCount: memory.audit_logs.length };
  }

  // 15. INSERT / UPDATE generic
  if (lower.startsWith('insert into')) {
    const id = ++nextId;
    return { rows: [{ id }], rowCount: 1 };
  }
  if (lower.startsWith('update') || lower.startsWith('delete')) {
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

// Unified interface: delegates to Postgres if active, else in-memory mock
const pool = {
  query: async (text, params = []) => {
    if (usePg && pgPool) {
      try {
        return await pgPool.query(text, params);
      } catch (err) {
        console.warn('[db] Connexion PostgreSQL échouée, repli définitif sur base en mémoire :', err.message);
        usePg = false;
      }
    }
    return mockQuery(text, params);
  },
  connect: async () => {
    if (usePg && pgPool) {
      try {
        return await pgPool.connect();
      } catch (err) {
        console.warn('[db] Connexion connect PostgreSQL échouée, repli définitif sur base en mémoire :', err.message);
        usePg = false;
      }
    }
    return {
      query: (t, p) => mockQuery(t, p),
      release: () => {},
    };
  },
  on: (event, handler) => {
    if (usePg && pgPool) pgPool.on(event, handler);
  },
  end: async () => {
    if (usePg && pgPool) await pgPool.end();
  },
};

async function queryWithRetry(text, params = [], retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const isTransient = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' ||
        err.code === '57P01' || err.code === '08006' || err.code === '08003' ||
        err.message?.includes('timeout') || err.message?.includes('terminated');
      if (!isTransient || attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}

async function get(text, params = []) {
  const result = await queryWithRetry(text, params);
  return result.rows ? result.rows[0] : null;
}

async function all(text, params = []) {
  const result = await queryWithRetry(text, params);
  return result.rows || [];
}

async function run(text, params = []) {
  const result = await queryWithRetry(text, params);
  return { changes: result.rowCount || 0, rows: result.rows || [] };
}

async function transaction(fn) {
  const client = await pool.connect();
  const scoped = {
    get: async (text, params = []) => {
      const res = await client.query(text, params);
      return res.rows ? res.rows[0] : null;
    },
    all: async (text, params = []) => {
      const res = await client.query(text, params);
      return res.rows || [];
    },
    run: async (text, params = []) => {
      const res = await client.query(text, params);
      return { changes: res.rowCount || 0, rows: res.rows || [] };
    },
  };

  try {
    await client.query('BEGIN');
    const value = await fn(scoped);
    await client.query('COMMIT');
    return value;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, get, all, run, transaction };
