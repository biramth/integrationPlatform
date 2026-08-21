CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  -- Pas de rôle "admin" séparé : la commission IT EST l'administration de la
  -- plateforme (super-utilisateur, cf. requireRole dans middleware/auth.js).
  -- "presidentielle" = commission qui fixe le programme des activités
  -- d'intégration (son vrai nom, pas "activités").
  role          TEXT NOT NULL CHECK (role IN ('orga','sante','cuisine','it','communication','culturelle','presidentielle')),
  -- Sous-rôle : restreint un agent à un seul sous-domaine de sa commission.
  -- Orga : chambres / enregistrement / bagages. Santé : suivi (risques, suivi,
  -- allergènes) / phase2 (complément de dossier — traitement, allergies,
  -- admission). NULL = accès à tous les sous-domaines de sa commission.
  sub_role      TEXT CHECK (sub_role IN ('chambres','enregistrement','bagages','suivi','phase2')),
  -- Chef de commission : droits supplémentaires pour gérer les autres agents de sa
  -- propre commission (hors it, qui gère déjà tout le monde).
  is_commission_lead  BOOLEAN NOT NULL DEFAULT FALSE,
  can_reset_platform  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label           TEXT NOT NULL UNIQUE,
  gender          TEXT NOT NULL CHECK (gender IN ('M','F')),
  capacity        INTEGER NOT NULL CHECK (capacity > 0),
  building        TEXT,
  -- NULL = pas encore compté sur le terrain par la commission Orga
  mattress_count  INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dossier DUT1 : phase 1 = colonnes obligatoires ; phase 2 = complementary_completed_at + extra_fields_json
-- birth_date reste TEXT (YYYY-MM-DD) pour éviter toute conversion de fuseau horaire à l'affichage.
CREATE TABLE IF NOT EXISTS dut1_records (
  id                          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  student_number              TEXT UNIQUE,
  last_name                   TEXT NOT NULL,
  first_name                  TEXT NOT NULL,
  birth_date                  TEXT NOT NULL,
  birth_place                 TEXT NOT NULL,
  gender                      TEXT NOT NULL CHECK (gender IN ('M','F')),
  phone_number                TEXT,
  department                  TEXT NOT NULL CHECK (department IN ('GC','GE','GI','ITR','GM','GCBA','Gestion')),
  father_name                 TEXT,
  mother_name                 TEXT,
  father_phone                TEXT,
  mother_phone                TEXT,
  address                     TEXT,

  complementary_completed_at  TIMESTAMPTZ,
  complementary_completed_by  INTEGER REFERENCES users(id),
  extra_fields_json           TEXT,

  room_id           INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  room_assigned_at  TIMESTAMPTZ,

  -- Bagages (commission Orga) : nombre déclaré par le DUT1, un luggage_item par bagage photographié
  luggage_count     INTEGER,

  created_by  INTEGER NOT NULL REFERENCES users(id),
  updated_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un bagage = une photo (Supabase Storage) + son statut "objet sensible" (espèces, électronique, papiers importants...)
-- file_path stocke le chemin de l'objet dans le bucket Supabase Storage (pas un chemin disque local).
-- Référentiel des admis au concours, importé depuis les PDF officiels (un fichier par
-- département). Sert d'aide à la saisie (autocomplete + pré-remplissage) en phase 1,
-- jamais de source de vérité pour dut1_records (le dossier reste saisi/validé par un agent).
CREATE TABLE IF NOT EXISTS admitted_students (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  last_name       TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  birth_date      TEXT,
  birth_place     TEXT,
  department      TEXT NOT NULL CHECK (department IN ('GC','GE','GI','ITR','GM','GCBA','Gestion')),
  rank            INTEGER,
  list_type       TEXT NOT NULL CHECK (list_type IN ('principale','attente')),
  matched_dut1_id INTEGER REFERENCES dut1_records(id) ON DELETE SET NULL,
  imported_by     INTEGER NOT NULL REFERENCES users(id),
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation "liste principale / liste d'attente" du dossier DUT1 : statut informatif,
-- ne bloque aucune autre action. Réglable par le registrar (phase 2) ou l'admin.
ALTER TABLE dut1_records
  ADD COLUMN IF NOT EXISTS admission_list_type TEXT
    CHECK (admission_list_type IN ('principale','attente')),
  ADD COLUMN IF NOT EXISTS admission_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admission_validated_by INTEGER REFERENCES users(id);

-- Génie Informatique se scinde en deux départements à part entière : GI (option
-- Informatique) et ITR (option Informatique, Télécommunications et Réseaux). Contraintes
-- redéfinies (drop puis recreate) pour rester ré-exécutables sans erreur à chaque migration.
ALTER TABLE dut1_records DROP CONSTRAINT IF EXISTS dut1_records_department_check;
ALTER TABLE dut1_records ADD CONSTRAINT dut1_records_department_check
  CHECK (department IN ('GC','GE','GI','ITR','GM','GCBA','Gestion'));

-- Traitement médical en cours, déclaré en phase 2 (question fermée oui/non +
-- détail libre si oui). on_treatment reste NULL tant que la phase 2 n'a pas
-- été complétée (distingue "pas encore répondu" de "a répondu non").
ALTER TABLE dut1_records
  ADD COLUMN IF NOT EXISTS on_treatment BOOLEAN,
  ADD COLUMN IF NOT EXISTS treatment_details TEXT;

-- Réorganisation des commissions : "registrar" et "logistics" étaient deux rôles
-- distincts alors qu'ils appartiennent à la même commission Orga (chambres +
-- enregistrement + bagages) — fusionnés en un seul rôle "orga".
--
-- migrate.js réexécute ce fichier en entier à CHAQUE déploiement (ce n'est pas
-- un système de migrations versionnées) : toute étape qui resserre la
-- contrainte à une liste figée devient un piège pour les déploiements futurs
-- dès qu'un nouveau rôle est ajouté plus tard (une ligne déjà migrée vers ce
-- nouveau rôle violerait la liste resserrée). D'où un seul élargissement en
-- haut couvrant tout l'historique, puis un seul resserrement à la toute fin de
-- ce fichier, sur l'ensemble des rôles réellement valides aujourd'hui.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('orga','admin','sante','cuisine','it','communication','culturelle','activites','presidentielle','registrar','logistics'));

UPDATE users SET role = 'orga' WHERE role IN ('registrar', 'logistics');

-- Transmission de la plateforme entre générations IT : seule une poignée de comptes
-- "it" (ceux qui portent ce flag) peuvent déclencher la remise à zéro des données
-- d'une édition pour la suivante (cf. resetPlatform dans adminController.js).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_reset_platform BOOLEAN NOT NULL DEFAULT FALSE;

-- Sous-rôles de commission : un agent Orga peut être restreint à un seul sous-domaine
-- (chambres / enregistrement / bagages) au lieu d'avoir accès aux trois par défaut.
-- Un "chef de commission" (toutes commissions) peut gérer les autres agents de sa
-- propre commission, en plus de son rôle habituel.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sub_role TEXT,
  ADD COLUMN IF NOT EXISTS is_commission_lead BOOLEAN NOT NULL DEFAULT FALSE;

-- Ajout des sous-rôles Santé (suivi / phase2) : élargissement, jamais de
-- resserrement ici, donc sûr à rejouer sans egard à l'ordre par rapport aux
-- données existantes (contrairement au piège rencontré avec users_role_check).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sub_role_check;
ALTER TABLE users ADD CONSTRAINT users_sub_role_check
  CHECK (sub_role IN ('chambres','enregistrement','bagages','suivi','phase2'));

-- "admin" n'est pas une commission à part : la commission IT EST l'admin de la
-- plateforme, donc les comptes admin deviennent des comptes it (chef +
-- habilité à réinitialiser la plateforme, pour conserver leurs pleins
-- pouvoirs). "activites" est renommé "presidentielle", son vrai nom. (La
-- contrainte a déjà été élargie pour ces deux valeurs plus haut.)
UPDATE users SET role = 'it', is_commission_lead = TRUE, can_reset_platform = TRUE WHERE role = 'admin';
UPDATE users SET role = 'presidentielle' WHERE role = 'activites';

-- Resserrement final : seuls ces rôles sont valides aujourd'hui.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('orga','sante','cuisine','it','communication','culturelle','presidentielle'));

ALTER TABLE admitted_students DROP CONSTRAINT IF EXISTS admitted_students_department_check;
ALTER TABLE admitted_students ADD CONSTRAINT admitted_students_department_check
  CHECK (department IN ('GC','GE','GI','ITR','GM','GCBA','Gestion'));

CREATE TABLE IF NOT EXISTS luggage_items (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dut1_id         INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,
  original_name   TEXT,
  is_sensitive    BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive_note  TEXT,
  uploaded_by     INTEGER NOT NULL REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_assignment_history (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dut1_id      INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  old_room_id  INTEGER REFERENCES rooms(id),
  new_room_id  INTEGER REFERENCES rooms(id),
  changed_by   INTEGER NOT NULL REFERENCES users(id),
  reason       TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allergènes (liste gérée par la commission Santé)
CREATE TABLE IF NOT EXISTS allergens (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allergies déclarées d'un DUT1 (sélection structurée, remplie en phase 2)
CREATE TABLE IF NOT EXISTS dut1_allergens (
  dut1_id      INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  allergen_id  INTEGER NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (dut1_id, allergen_id)
);

ALTER TABLE dut1_allergens
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'moderee'
  CHECK (severity IN ('legere','moderee','severe'));

-- Services de repas (commission Cuisine) : un par jour + type de repas
-- service_date reste TEXT (YYYY-MM-DD), comparé tel quel dans les requêtes.
CREATE TABLE IF NOT EXISTS meal_services (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_date  TEXT NOT NULL,
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('petit-dejeuner','dejeuner','diner')),
  created_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_date, meal_type)
);

CREATE TABLE IF NOT EXISTS dishes (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meal_service_id   INTEGER NOT NULL REFERENCES meal_services(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  created_by        INTEGER NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dish_allergens (
  dish_id      INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  allergen_id  INTEGER NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (dish_id, allergen_id)
);

-- Remplacé par activities + health_restrictions (système d'aptitude) ci-dessous.
DROP TABLE IF EXISTS illness_records CASCADE;

-- Activités de la semaine d'intégration, définies par l'admin.
CREATE TABLE IF NOT EXISTS activities (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           TEXT NOT NULL,
  activity_date  TEXT NOT NULL,
  end_date       TEXT,
  -- Heure de début (HH:MM), optionnelle : plusieurs activités le même jour se
  -- distinguent par leur heure, pas seulement par leur nom.
  start_time     TEXT,
  description    TEXT,
  created_by     INTEGER NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restriction d'aptitude d'un DUT1 : couvre [start_date, end_date] (end_date
-- NULL = jusqu'à résolution explicite), scope à une activité (activity_id)
-- ou générale (NULL). resolved_at NULL = restriction active.
CREATE TABLE IF NOT EXISTS health_restrictions (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dut1_id      INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  activity_id  INTEGER REFERENCES activities(id) ON DELETE SET NULL,
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  reason       TEXT NOT NULL,
  declared_by  INTEGER NOT NULL REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  resolved_by  INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dut1_department ON dut1_records(department);
CREATE INDEX IF NOT EXISTS idx_dut1_gender ON dut1_records(gender);
CREATE INDEX IF NOT EXISTS idx_dut1_room ON dut1_records(room_id);
CREATE INDEX IF NOT EXISTS idx_dut1_complementary ON dut1_records(complementary_completed_at);
CREATE INDEX IF NOT EXISTS idx_luggage_dut1 ON luggage_items(dut1_id);
CREATE INDEX IF NOT EXISTS idx_dish_allergens_dish ON dish_allergens(dish_id);
CREATE INDEX IF NOT EXISTS idx_dut1_allergens_dut1 ON dut1_allergens(dut1_id);
CREATE INDEX IF NOT EXISTS idx_health_restrictions_dut1 ON health_restrictions(dut1_id);
CREATE INDEX IF NOT EXISTS idx_health_restrictions_dates ON health_restrictions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_meal_services_date ON meal_services(service_date);
CREATE INDEX IF NOT EXISTS idx_admitted_students_department ON admitted_students(department);
CREATE INDEX IF NOT EXISTS idx_admitted_students_names ON admitted_students(last_name, first_name);

-- Heure de début d'une activité (HH:MM) : plusieurs activités le même jour se
-- distinguent par leur heure, pas seulement par leur nom.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_time TEXT;
