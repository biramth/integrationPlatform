CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('registrar','logistics','admin','sante','cuisine')),
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
  department                  TEXT NOT NULL CHECK (department IN ('GC','GE','GI','GM','GCBA','Gestion')),
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

-- Déclarations de maladie (commission Santé). illness_date reste TEXT (YYYY-MM-DD).
CREATE TABLE IF NOT EXISTS illness_records (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dut1_id       INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  illness_date  TEXT NOT NULL,
  note          TEXT,
  declared_by   INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dut1_department ON dut1_records(department);
CREATE INDEX IF NOT EXISTS idx_dut1_gender ON dut1_records(gender);
CREATE INDEX IF NOT EXISTS idx_dut1_room ON dut1_records(room_id);
CREATE INDEX IF NOT EXISTS idx_dut1_complementary ON dut1_records(complementary_completed_at);
CREATE INDEX IF NOT EXISTS idx_luggage_dut1 ON luggage_items(dut1_id);
CREATE INDEX IF NOT EXISTS idx_dish_allergens_dish ON dish_allergens(dish_id);
CREATE INDEX IF NOT EXISTS idx_dut1_allergens_dut1 ON dut1_allergens(dut1_id);
CREATE INDEX IF NOT EXISTS idx_illness_dut1 ON illness_records(dut1_id);
CREATE INDEX IF NOT EXISTS idx_meal_services_date ON meal_services(service_date);
