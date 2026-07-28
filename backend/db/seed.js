require('dotenv').config();
const db = require('./database');
const { hashPassword } = require('../services/passwordService');

const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123';

const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);

if (!existingAdmin) {
  db.prepare(
    `INSERT INTO users (full_name, username, password_hash, role) VALUES (?, ?, ?, 'admin')`
  ).run('Administrateur', adminUsername, hashPassword(adminPassword));
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

const insertRoom = db.prepare(
  'INSERT OR IGNORE INTO rooms (label, gender, capacity, building) VALUES (@label, @gender, @capacity, @building)'
);

for (const room of testRooms) {
  insertRoom.run(room);
}

console.log('Chambres de test vérifiées/créées.');

const testAgents = [
  { fullName: 'Fatou Ndiaye', username: 'registrar1', role: 'registrar' },
  { fullName: 'Moussa Diop', username: 'logistics1', role: 'logistics' },
  { fullName: 'Aminata Ba', username: 'sante1', role: 'sante' },
  { fullName: 'Ousmane Fall', username: 'cuisine1', role: 'cuisine' },
];

const insertAgent = db.prepare(
  'INSERT OR IGNORE INTO users (full_name, username, password_hash, role) VALUES (@fullName, @username, @passwordHash, @role)'
);

for (const agent of testAgents) {
  insertAgent.run({ ...agent, passwordHash: hashPassword('pass123') });
}

console.log('Comptes agents de test vérifiés/créés (mot de passe : pass123).');

const ALLERGENS = [
  'Gluten (céréales)', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait',
  'Fruits à coque', 'Céleri', 'Moutarde', 'Graines de sésame',
  'Anhydride sulfureux et sulfites', 'Lupin', 'Mollusques',
];

const insertAllergen = db.prepare('INSERT OR IGNORE INTO allergens (label) VALUES (?)');
for (const label of ALLERGENS) {
  insertAllergen.run(label);
}

console.log('Liste des 14 allergènes majeurs vérifiée/créée.');
