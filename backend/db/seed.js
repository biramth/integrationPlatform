require('dotenv').config();
const db = require('./database');
const { hashPassword } = require('../services/passwordService');

const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123';

async function seed() {
  const existingAdmin = await db.get('SELECT id FROM users WHERE username = $1', [adminUsername]);

  if (!existingAdmin) {
    await db.run(
      `INSERT INTO users (full_name, username, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      ['Administrateur', adminUsername, hashPassword(adminPassword)]
    );
    console.log(`Compte admin créé : ${adminUsername} / ${adminPassword}`);
  } else {
    console.log('Compte admin déjà existant, non recréé.');
  }

  const testRooms = [
    { label: 'A-101', gender: 'F', capacity: 4, building: 'Pavillon A' },
    { label: 'A-102', gender: 'F', capacity: 4, building: 'Pavillon A' },
    { label: 'B-101', gender: 'M', capacity: 4, building: 'Pavillon B' },
    { label: 'B-102', gender: 'M', capacity: 4, building: 'Pavillon B' },
  ];

  for (const room of testRooms) {
    await db.run(
      'INSERT INTO rooms (label, gender, capacity, building) VALUES ($1, $2, $3, $4) ON CONFLICT (label) DO NOTHING',
      [room.label, room.gender, room.capacity, room.building]
    );
  }
  console.log('Chambres de test vérifiées/créées.');

  const testAgents = [
    { fullName: 'Fatou Ndiaye', username: 'registrar1', role: 'registrar' },
    { fullName: 'Moussa Diop', username: 'logistics1', role: 'logistics' },
    { fullName: 'Aminata Ba', username: 'sante1', role: 'sante' },
    { fullName: 'Ousmane Fall', username: 'cuisine1', role: 'cuisine' },
  ];

  for (const agent of testAgents) {
    await db.run(
      'INSERT INTO users (full_name, username, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
      [agent.fullName, agent.username, hashPassword('pass123'), agent.role]
    );
  }
  console.log('Comptes agents de test vérifiés/créés (mot de passe : pass123).');

  const ALLERGENS = [
    'Gluten (céréales)', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait',
    'Fruits à coque', 'Céleri', 'Moutarde', 'Graines de sésame',
    'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques',
  ];

  for (const label of ALLERGENS) {
    await db.run('INSERT INTO allergens (label) VALUES ($1) ON CONFLICT (label) DO NOTHING', [label]);
  }
  console.log('Liste des 14 allergènes majeurs vérifiée/créée.');

  await db.pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
