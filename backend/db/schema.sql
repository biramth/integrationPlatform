CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  -- Pas de rôle "admin" séparé : la commission IT EST l'administration de la
  -- plateforme (super-utilisateur, cf. requireRole dans middleware/auth.js).
  -- "presidentielle" = commission qui fixe le programme des activités
  -- d'intégration (son vrai nom, pas "activités").
  role          TEXT NOT NULL CHECK (role IN ('orga','sante','cuisine','it','communication','culturelle','presidentielle','dreudj')),
  -- Sous-rôle : restreint un agent à un seul sous-domaine de sa commission.
  -- Orga : chambres / enregistrement / bagages. Santé : suivi (risques, suivi,
  -- allergènes) / phase2 (complément de dossier — traitement, allergies) /
  -- medoc (stock de médicaments). NULL = accès à tous les sous-domaines de sa
  -- commission.
  sub_role      TEXT CHECK (sub_role IN ('chambres','enregistrement','bagages','suivi','phase2','medoc')),
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

-- Colonnes dépréciées, plus renseignées ni lues par aucun code applicatif
-- (retiré : ça ne servait qu'à accélérer la recherche à l'enregistrement, pas
-- une fonctionnalité à garder) — conservées telles quelles plutôt que
-- droppées, comme le reste de ce fichier (jamais de DROP COLUMN).
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
-- 'dreudj' inclus ici aussi (pas seulement dans le resserrement final plus
-- bas) : cet élargissement est rejoué tel quel à chaque déploiement, donc
-- toute valeur de rôle réellement utilisée en base doit y figurer, même une
-- ajoutée après l'écriture initiale de cette étape historique.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('orga','admin','sante','cuisine','it','communication','culturelle','activites','presidentielle','registrar','logistics','dreudj'));

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
  CHECK (sub_role IN ('chambres','enregistrement','bagages','suivi','phase2','medoc'));

-- "admin" n'est pas une commission à part : la commission IT EST l'admin de la
-- plateforme, donc les comptes admin deviennent des comptes it (chef +
-- habilité à réinitialiser la plateforme, pour conserver leurs pleins
-- pouvoirs). "activites" est renommé "presidentielle", son vrai nom. (La
-- contrainte a déjà été élargie pour ces deux valeurs plus haut.)
UPDATE users SET role = 'it', is_commission_lead = TRUE, can_reset_platform = TRUE WHERE role = 'admin';
UPDATE users SET role = 'presidentielle' WHERE role = 'activites';

-- Resserrement final : seuls ces rôles sont valides aujourd'hui. "dreudj" est
-- une nouvelle valeur (jamais utilisée par une ligne existante), donc pas
-- besoin d'élargissement préalable — l'ajouter directement ici suffit.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('orga','sante','cuisine','it','communication','culturelle','presidentielle','dreudj'));

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

-- Livraison des bagages en chambre : le sous-rôle Orga "chambres" ne
-- configure pas les chambres (ressort du chef Orga, cf. requireCommissionLeadStrict
-- dans middleware/auth.js) — son travail est d'aller déposer, dans la chambre
-- déjà assignée à chaque DUT1, les bagages que l'agent "bagages" a
-- photographiés, puis de confirmer ce dépôt. NULL tant que non confirmé,
-- distinct de room_assigned_at (l'attribution de la chambre elle-même).
ALTER TABLE dut1_records
  ADD COLUMN IF NOT EXISTS luggage_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS luggage_delivered_by INTEGER REFERENCES users(id);

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

-- Questions configurables de la phase 2 (complément de dossier), définies par
-- le chef de la commission Santé. field_key ne change jamais après création
-- (même si le libellé est renommé) : c'est la clé sous laquelle la réponse
-- est stockée dans dut1_records.extra_fields_json, un JSON libre qui ne
-- référence pas cette table par contrainte — supprimer une question n'efface
-- donc pas les réponses déjà enregistrées, elle cesse juste d'être posée.
CREATE TABLE IF NOT EXISTS phase2_questions (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  field_key   TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('texte_court','texte_long','choix_unique','choix_multiple','oui_non')),
  options     JSONB,
  required    BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase2_questions_position ON phase2_questions(position);

-- Reprend les deux questions historiquement codées en dur, pour que les
-- dossiers déjà remplis restent lisibles après le passage au système
-- configurable. Le chef de la commission Santé peut ensuite les renommer,
-- les modifier ou les supprimer comme n'importe quelle autre question.
INSERT INTO phase2_questions (field_key, label, type, required, position)
VALUES
  ('personnalite', 'Traits de personnalité', 'texte_long', FALSE, 0),
  ('remarques', 'Remarques diverses', 'texte_long', FALSE, 1)
ON CONFLICT (field_key) DO NOTHING;

-- Le chef Santé configure le questionnaire de phase 2 dans son ENTIER, pas
-- juste des questions bonus à la fin : traitement/allergies rejoignent la
-- même liste réordonnable que les questions libres, au lieu d'être des
-- sections à part câblées en dur dans la page. Elles restent des types à
-- part (pas 'custom') car leur réponse est stockée dans des colonnes/tables
-- dédiées (dut1_records.on_treatment, dut1_allergens...), jamais dans
-- extra_fields_json — field_key n'est ici qu'un repère stable, pas une clé
-- de stockage. Verrouillées côté backend (type figé, suppression bloquée)
-- car Risques du jour et le croisement menu/allergènes en dépendent.
--
-- 'admission' (admission_list_type) a existé un temps comme troisième type
-- intégré, mais ne servait qu'à pré-remplir la fiche depuis la liste des
-- admis — pas une fonctionnalité à garder. La ligne est retirée (DELETE
-- avant le resserrement de la contrainte, pour rester ré-exécutable) ; la
-- colonne dut1_records.admission_list_type elle-même n'est pas droppée
-- (cf. plus haut, on ne supprime jamais de colonne dans ce fichier).
DELETE FROM phase2_questions WHERE field_key = 'admission_list_type';

ALTER TABLE phase2_questions DROP CONSTRAINT IF EXISTS phase2_questions_type_check;
ALTER TABLE phase2_questions ADD CONSTRAINT phase2_questions_type_check
  CHECK (type IN ('texte_court','texte_long','choix_unique','choix_multiple','oui_non','traitement_medical','allergies'));

-- Positions négatives : elles se placent avant personnalite/remarques (0/1)
-- sans avoir à toucher aux positions déjà attribuées ailleurs.
INSERT INTO phase2_questions (field_key, label, type, required, position)
VALUES
  ('on_treatment', 'Traitement médical en cours ?', 'traitement_medical', TRUE, -20),
  ('allergies', 'Allergies', 'allergies', FALSE, -10)
ON CONFLICT (field_key) DO NOTHING;

-- Interrupteurs de fonctionnalités "jour d'accueil" : Enregistrement (phase 1,
-- Orga) et Phase 2 (complément de dossier, Santé) n'ont d'utilité que le
-- premier jour — IT les désactive une fois la saisie terminée pour empêcher
-- toute altération ultérieure des dossiers. La page correspondante disparaît
-- alors du menu des agents concernés et l'API refuse l'action (cf.
-- requireFeatureEnabled), même pour IT : le but est de figer les données,
-- pas de garder une porte de secours. TRUE par défaut, pour ne rien changer
-- au comportement de la plateforme tant qu'IT n'a rien désactivé.
CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (key, enabled) VALUES
  ('registration', TRUE),
  ('phase2', TRUE)
ON CONFLICT (key) DO NOTHING;

-- Journal d'audit générique : qui a fait quoi, sur quelle ressource, quand.
-- commission = domaine métier PROPRIÉTAIRE de la ressource touchée (pas le rôle
-- de l'acteur — un compte "it" peut agir sur une ressource "sante"). 'global'
-- couvre les actions qui ne relèvent d'aucune commission unique (reset
-- plateforme), visibles seulement par IT, jamais par un chef de commission
-- scopé à sa propre commission.
-- actor_snapshot fige nom/rôle/sous-rôle/chef au moment de l'action : le rôle
-- en base (users.role) peut changer après coup, et l'utilisateur peut même
-- être supprimé (cf. hardDeleteAgent) sans que la ligne d'audit perde son sens.
-- BIGINT (pas INTEGER) : contrairement aux tables métier, celle-ci ne fait
-- que grossir (append-only, jamais purgée).
CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  actor_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_snapshot  JSONB NOT NULL,

  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  resource_label  TEXT,

  commission      TEXT NOT NULL
    CHECK (commission IN ('orga','sante','cuisine','it','communication','culturelle','presidentielle','dreudj','global')),

  before_data     JSONB,
  after_data      JSONB,

  success         BOOLEAN NOT NULL DEFAULT TRUE,
  error_message   TEXT,

  request_id      TEXT,
  ip_address      TEXT,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CREATE TABLE IF NOT EXISTS ne retouche pas la contrainte sur une table déjà
-- créée par un déploiement précédent : élargissement explicite pour "dreudj"
-- (nouvelle commission), au nom auto-généré par Postgres pour une contrainte
-- de colonne inline (<table>_<colonne>_check).
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_commission_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_commission_check
  CHECK (commission IN ('orga','sante','cuisine','it','communication','culturelle','presidentielle','dreudj','global'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_commission_created ON audit_logs(commission, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Stock de médicaments (commission Santé, sous-rôle "medoc") : le responsable
-- désigné enregistre chaque mouvement, le stock courant s'en déduit.
-- reference_stock sert de repère "stock plein" pour le pourcentage affiché au
-- chef de commission (current_stock / reference_stock), pas une limite dure.
CREATE TABLE IF NOT EXISTS medications (
  id                       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                     TEXT NOT NULL UNIQUE,
  unit                     TEXT NOT NULL DEFAULT 'unité(s)',
  reference_stock          INTEGER NOT NULL CHECK (reference_stock > 0),
  current_stock            INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  alert_threshold_percent  INTEGER NOT NULL DEFAULT 20 CHECK (alert_threshold_percent BETWEEN 0 AND 100),
  created_by               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historique des mouvements : quantity est un delta signé (positif = entrée,
-- négatif = sortie ou ajustement à la baisse) ; stock_after fige le résultat
-- pour reconstituer l'évolution dans le temps sans rejouer tout l'historique.
-- type reste indicatif (filtre/affichage) : un ajustement (recomptage) peut
-- aller dans les deux sens, sa quantité n'est donc pas contrainte en signe.
CREATE TABLE IF NOT EXISTS medication_movements (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  medication_id  INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('entree','sortie','ajustement')),
  quantity       INTEGER NOT NULL CHECK (quantity <> 0),
  stock_after    INTEGER NOT NULL CHECK (stock_after >= 0),
  note           TEXT,
  recorded_by    INTEGER NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_movements_medication ON medication_movements(medication_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medication_movements_created_at ON medication_movements(created_at DESC);
