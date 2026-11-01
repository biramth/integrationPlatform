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
  -- Orga : logistique / enregistrement / bagages. Santé : suivi (risques, suivi,
  -- allergènes) / phase2 (complément de dossier — traitement, allergies) /
  -- medoc (stock de médicaments). NULL = accès à tous les sous-domaines de sa
  -- commission.
  sub_role      TEXT CHECK (sub_role IN ('logistique','enregistrement','bagages','suivi','phase2','medoc')),
  -- Chef de commission : droits supplémentaires pour gérer les autres agents de sa
  -- propre commission (hors it, qui gère déjà tout le monde).
  is_commission_lead  BOOLEAN NOT NULL DEFAULT FALSE,
  can_reset_platform  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Incrémenté à chaque changement de mot de passe / désactivation : invalide
  -- tous les JWT existants sans Redis blacklist (cf. middleware/auth.js).
  token_version      INTEGER NOT NULL DEFAULT 0,
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
  department                  TEXT NOT NULL CHECK (department IN ('GC','GE','INFO','ITR','GM','IA','BA','GCH','GB','Gestion')),
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
  department      TEXT NOT NULL CHECK (department IN ('GC','GE','INFO','ITR','GM','IA','BA','GCH','GB','Gestion')),
  rank            INTEGER,
  list_type       TEXT NOT NULL CHECK (list_type IN ('principale','attente')),
  matched_dut1_id INTEGER REFERENCES dut1_records(id) ON DELETE SET NULL,
  imported_by     INTEGER NOT NULL REFERENCES users(id),
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts d'urgence et téléphone importés depuis le CSV "Vos coordonnées" :
-- fusionnés avec le référentiel des admis pour pré-remplir au maximum les
-- champs lors de l'enregistrement d'un DUT1.
ALTER TABLE admitted_students
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contacts_json TEXT;

-- Colonnes dépréciées, plus renseignées ni lues par aucun code applicatif
-- (retiré : ça ne servait qu'à accélérer la recherche à l'enregistrement, pas
-- une fonctionnalité à garder) — conservées telles quelles plutôt que
-- droppées, comme le reste de ce fichier (jamais de DROP COLUMN).
ALTER TABLE dut1_records
  ADD COLUMN IF NOT EXISTS admission_list_type TEXT
    CHECK (admission_list_type IN ('principale','attente')),
  ADD COLUMN IF NOT EXISTS admission_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admission_validated_by INTEGER REFERENCES users(id);

-- Historique : les options de GI et GCBA ont un temps vécu dans
-- admitted_students.option_code sous des départements « coiffe » GI/GCBA
-- (ITR était alors replié dans GI). Elles sont redevenues des départements à
-- part entière (cf. fin de fichier). Ce bloc, rejoué à chaque déploiement,
-- n'élargit plus qu'à l'union ancien + nouveau référentiel — surtout plus
-- d'UPDATE ITR -> GI, ITR étant de nouveau un département valide.
ALTER TABLE dut1_records DROP CONSTRAINT IF EXISTS dut1_records_department_check;
ALTER TABLE dut1_records ADD CONSTRAINT dut1_records_department_check
  CHECK (department IN ('GC','GE','GI','GM','GCBA','GB','Gestion','INFO','ITR','IA','BA','GCH'));

-- Remplace la saisie père/mère du formulaire d'enregistrement par des
-- "numéros à contacter en cas d'urgence" : liste libre de contacts
-- [{ name, phone }], stockée en JSON comme extra_fields_json. Les colonnes
-- father_name/mother_name/father_phone/mother_phone restent en base (jamais de
-- DROP COLUMN dans ce fichier) mais ne sont plus alimentées par aucun écran.
ALTER TABLE dut1_records
  ADD COLUMN IF NOT EXISTS emergency_contacts_json TEXT;

-- Traitement médical en cours, déclaré en phase 2 (question fermée oui/non +
-- détail libre si oui). on_treatment reste NULL tant que la phase 2 n'a pas
-- été complétée (distingue "pas encore répondu" de "a répondu non").
-- Ce flag n'est plus lu par aucun écran de suivi : il sert désormais de source
-- d'import vers dut1_treatments (plus bas), où vit le vrai suivi des prises.
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

-- Chef de pôle : rôle intermédiaire propre à Orga, entre agent de sous-rôle et
-- chef de commission. Reçoit la parité complète avec le chef de commission —
-- toutes les fonctionnalités (Vue d'ensemble, configuration des chambres,
-- annuaire, gestion des agents, journal d'audit — cf.
-- requireCommissionLeadStrict / requireCommissionLead / requireAgentManagement
-- dans middleware/auth.js et navConfig.js côté front) — et peut en plus jouer
-- tous les sous-rôles de la commission (enregistrement / bagages / chambres,
-- cf. requireOrgaScope), ce que le chef de commission ne fait pas lui-même
-- (il supervise, il n'exécute pas). Le drapeau est posé par it ou par le chef
-- Orga lui-même sur ses agents (cf. canDelegatePoleLead dans
-- agentController.js) — pas d'auto-promotion.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_pole_lead BOOLEAN NOT NULL DEFAULT FALSE;

-- Ajout des sous-rôles Santé (suivi / phase2) : élargissement, jamais de
-- resserrement ici, donc sûr à rejouer sans egard à l'ordre par rapport aux
-- données existantes (contrairement au piège rencontré avec users_role_check).
-- 'logistique' doit figurer ici aussi : ce fichier est rejoué à chaque déploiement,
-- et une fois le renommage chambres -> logistique appliqué (plus bas), une liste
-- sans 'logistique' ferait échouer la migration sur les lignes déjà migrées.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sub_role_check;
ALTER TABLE users ADD CONSTRAINT users_sub_role_check
  CHECK (sub_role IN ('chambres','logistique','enregistrement','bagages','suivi','phase2','medoc'));

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
  CHECK (department IN ('GC','GE','GI','GM','GCBA','GB','Gestion','INFO','ITR','IA','BA','GCH'));

-- Colonne dépréciée (plus renseignée ni lue) : l'option de GI / GCBA est
-- désormais portée par department lui-même (cf. fin de fichier). Conservée,
-- jamais de DROP COLUMN ; elle sert encore à migrer les anciennes lignes.
ALTER TABLE admitted_students
  ADD COLUMN IF NOT EXISTS option_code TEXT;

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

-- 'aptitude' ajouté en même temps que le resserrement (jamais utilisé avant,
-- pas besoin d'élargissement séparé) : réponse câblée sur dut1_aptitude_levels
-- (cf. plus bas), pas sur extra_fields_json, comme allergies/traitement_medical.
ALTER TABLE phase2_questions DROP CONSTRAINT IF EXISTS phase2_questions_type_check;
ALTER TABLE phase2_questions ADD CONSTRAINT phase2_questions_type_check
  CHECK (type IN ('texte_court','texte_long','choix_unique','choix_multiple','oui_non','traitement_medical','allergies','aptitude'));

-- Positions négatives : elles se placent avant personnalite/remarques (0/1)
-- sans avoir à toucher aux positions déjà attribuées ailleurs. "aptitude" est
-- obligatoire (contrairement à allergies) : pas de Oui/Non préalable, chaque
-- critère configuré attend une réponse (un niveau) pour chaque DUT1.
INSERT INTO phase2_questions (field_key, label, type, required, position)
VALUES
  ('on_treatment', 'Traitement médical en cours ?', 'traitement_medical', TRUE, -20),
  ('allergies', 'Allergies', 'allergies', FALSE, -10),
  ('aptitude_criteria', 'Critères d''aptitude', 'aptitude', TRUE, -5)
ON CONFLICT (field_key) DO NOTHING;

-- Si la ligne existait déjà (créée quand le type était encore optionnel),
-- l'élargir en obligatoire : ON CONFLICT DO NOTHING ci-dessus ne touche pas
-- une ligne déjà présente.
UPDATE phase2_questions SET required = TRUE WHERE field_key = 'aptitude_criteria';

-- Interrupteurs de fonctionnalités "jour d'accueil" : Enregistrement (phase 1),
-- Bagages (photo/comptage) et Logistique (livraison en chambre) — tout le
-- parcours Orga d'un DUT1 à son arrivée, pas seulement l'enregistrement — et
-- Phase 2 (complément de dossier, Santé) n'ont d'utilité que le premier jour
-- — IT les désactive une fois la saisie terminée pour empêcher toute
-- altération ultérieure des dossiers. La page correspondante disparaît alors
-- du menu des agents concernés et l'API refuse l'action (cf.
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
  ('luggage', TRUE),
  ('logistics', TRUE),
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

-- Traitements médicaux suivis par la commission Santé ("suivi") : contrairement
-- à la simple déclaration phase 2 (dut1_records.on_treatment, texte libre,
-- jamais bornée dans le temps), un traitement est structuré — médicament du
-- stock OU personnel (label libre : la plupart des DUT1 se traitent avec leurs
-- propres médicaments, pas avec le stock de la commission), posologie,
-- créneaux de prise (matin/midi/soir, combinables) et fenêtre de dates.
-- Un traitement actif couvre [start_date, end_date] sans clôture anticipée
-- (ended_at) : dès que sa fenêtre est passée ou qu'il est clôturé, il sort
-- AUTOMATIQUEMENT des prises du jour et du badge "sous traitement", sans
-- intervention manuelle — c'est cette condition (reprise dans chaque requête)
-- qui répond à "traitement fini => enlevé de la liste".
CREATE TABLE IF NOT EXISTS dut1_treatments (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dut1_id          INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  medication_id    INTEGER REFERENCES medications(id) ON DELETE SET NULL,
  medication_label TEXT,
  dosage           TEXT,
  slot_matin       BOOLEAN NOT NULL DEFAULT FALSE,
  slot_midi        BOOLEAN NOT NULL DEFAULT FALSE,
  slot_soir        BOOLEAN NOT NULL DEFAULT FALSE,
  start_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date         DATE,
  notes            TEXT,
  ended_at         TIMESTAMPTZ,
  ended_by         INTEGER REFERENCES users(id),
  created_by       INTEGER REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Marque le traitement "déclaration" né de la phase 2 (question "traitement
  -- médical en cours ?") : une correction du dossier met CETTE ligne à jour
  -- (ou la clôture si la réponse passe à Non) sans jamais toucher aux
  -- traitements créés à la main depuis la page Traitements.
  source_phase2    BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (slot_matin OR slot_midi OR slot_soir)
);

ALTER TABLE dut1_treatments ADD COLUMN IF NOT EXISTS source_phase2 BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_dut1_treatments_dut1 ON dut1_treatments(dut1_id);
CREATE INDEX IF NOT EXISTS idx_dut1_treatments_dates ON dut1_treatments(start_date, end_date);

-- Prises effectivement marquées : une ligne par traitement/créneau/jour, créée
-- au moment du cochage par l'agent Santé. C'est ce qui permet de voir d'un coup
-- d'œil le matin qui a déjà pris son traitement et qui n'est pas encore passé —
-- et donc de réduire les oubli. UNIQUE garantit l'idempotence du cochage
-- (re-cliquer ne duplique rien) et sert de clé pour décocher une erreur.
CREATE TABLE IF NOT EXISTS treatment_intakes (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  treatment_id INTEGER NOT NULL REFERENCES dut1_treatments(id) ON DELETE CASCADE,
  intake_date  DATE NOT NULL,
  slot         TEXT NOT NULL CHECK (slot IN ('matin','midi','soir')),
  marked_by    INTEGER NOT NULL REFERENCES users(id),
  marked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (treatment_id, intake_date, slot)
);

CREATE INDEX IF NOT EXISTS idx_treatment_intakes_date_slot ON treatment_intakes(intake_date, slot);

-- Migration depuis la déclaration phase 2 : chaque DUT1 déclaré "sous
-- traitement" (on_treatment = TRUE sans traitement existant) devient un
-- traitement réel, tous créneaux activés par précaution — mieux vaut proposer
-- une prise à cocher que rater une prise réelle ; l'agent Santé ajuste ensuite
-- horaires/posologie depuis la page Traitements. Rejoué à CHAQUE déploiement :
-- le NOT EXISTS rend le rejeu sans effet, et une NOUVELLE déclaration phase 2
-- crée bien son traitement ; supprimer un traitement côté app repasse
-- on_treatment à FALSE (cf. deleteTreatment dans treatmentController.js),
-- sinon la migration recréerait la ligne au déploiement suivant.
INSERT INTO dut1_treatments (dut1_id, medication_label, slot_matin, slot_midi, slot_soir, start_date, notes, source_phase2)
SELECT d.id,
       COALESCE(NULLIF(btrim(d.treatment_details), ''), 'Médicament non précisé'),
       TRUE, TRUE, TRUE,
       CURRENT_DATE,
       'Importé depuis la déclaration phase 2 — horaires et posologie à préciser.',
       TRUE
FROM dut1_records d
WHERE d.on_treatment = TRUE
  AND NOT EXISTS (SELECT 1 FROM dut1_treatments t WHERE t.dut1_id = d.id);

-- Les traitements issus de migrations précédentes portent la note exacte
-- ci-dessus : on les marque source_phase2 pour qu'une correction du dossier
-- les mette à jour au lieu d'en créer un doublon (cf. completeComplementary).
UPDATE dut1_treatments
SET source_phase2 = TRUE
WHERE notes = 'Importé depuis la déclaration phase 2 — horaires et posologie à préciser.'
  AND source_phase2 = FALSE;

-- Référentiel des critères d'aptitude physique (commission Santé, chef
-- uniquement) : mêmes principes que les allergènes. Chaque critère porte sa
-- PROPRE échelle de niveaux nommés (aptitude_criterion_levels ci-dessous) —
-- pas un simple rempli/pas rempli, ni une échelle numérique commune à tous
-- les critères : "Sportif" peut avoir Pas sportif/Peu sportif/Sportif/Très
-- sportif, un autre critère aura ses propres libellés.
CREATE TABLE IF NOT EXISTS aptitude_criteria (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rank ordonne l'échelle (0 = niveau le plus faible) : c'est sur ce rang que
-- se comparent le niveau déclaré d'un DUT1 et le niveau minimum exigé par une
-- activité (ci-dessous), pas sur le libellé.
CREATE TABLE IF NOT EXISTS aptitude_criterion_levels (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criterion_id  INTEGER NOT NULL REFERENCES aptitude_criteria(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  rank          INTEGER NOT NULL,
  UNIQUE (criterion_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_aptitude_criterion_levels_criterion ON aptitude_criterion_levels(criterion_id, rank);

-- Niveau minimum exigé, par critère, pour participer à une activité donnée —
-- choisi par le chef de la commission Santé (Présidentielle crée l'activité
-- mais n'a pas la compétence médicale pour juger de ses prérequis physiques).
-- Aucune donnée existante au moment de ce passage au modèle gradué (la
-- fonctionnalité venait d'être livrée en rempli/pas rempli) : la table est
-- recréée directement avec min_level_id NOT NULL plutôt qu'élargie.
DROP TABLE IF EXISTS activity_required_criteria CASCADE;
CREATE TABLE IF NOT EXISTS activity_required_criteria (
  activity_id   INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  criterion_id  INTEGER NOT NULL REFERENCES aptitude_criteria(id) ON DELETE CASCADE,
  min_level_id  INTEGER NOT NULL REFERENCES aptitude_criterion_levels(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_required_criteria_activity ON activity_required_criteria(activity_id);

-- Une restriction ponctuelle liée à un critère reste un blocage simple et
-- total pour ce critère (pas de niveau) : utile pour un imprévu découvert
-- après l'enregistrement (blessure pendant la semaine), où le DUT1 ne doit
-- provisoirement plus être considéré apte du tout sur ce point, quel que soit
-- le niveau qu'il avait déclaré. Le profil gradué (dut1_aptitude_levels
-- ci-dessous) reste la source pour ce qui est connu dès l'enregistrement.
ALTER TABLE health_restrictions
  ADD COLUMN IF NOT EXISTS criterion_id INTEGER REFERENCES aptitude_criteria(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_health_restrictions_criterion ON health_restrictions(criterion_id);

-- Profil d'aptitude du DUT1, saisi obligatoirement à l'enregistrement (phase
-- 2, question intégrée "aptitude") : un niveau choisi par critère configuré
-- (pas de Oui/Non préalable, une réponse est requise pour chacun). Remplace
-- dut1_unmet_criteria (modèle rempli/pas rempli, aucune donnée réelle au
-- moment de ce changement — abandonnée plutôt que migrée). Contrairement à
-- health_restrictions, ce n'est pas borné dans le temps ni déclaré au coup
-- par coup : Risques du jour (getRisks) compare directement le rang du
-- niveau déclaré au rang minimum exigé par chaque activité du jour.
DROP TABLE IF EXISTS dut1_unmet_criteria CASCADE;
CREATE TABLE IF NOT EXISTS dut1_aptitude_levels (
  dut1_id      INTEGER NOT NULL REFERENCES dut1_records(id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES aptitude_criteria(id) ON DELETE CASCADE,
  level_id     INTEGER NOT NULL REFERENCES aptitude_criterion_levels(id) ON DELETE CASCADE,
  PRIMARY KEY (dut1_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_dut1_aptitude_levels_dut1 ON dut1_aptitude_levels(dut1_id);

-- Token revocation : colonne token_version sur users (incrémentée à chaque
-- changement de mot de passe ou désactivation, cf. middleware/auth.js).
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Prise en charge des bagages : étape intermédiaire entre "bagages
-- photographiés" (luggage_items) et "livrés en chambre"
-- (luggage_delivered_at) — l'agent qui vient récupérer les bagages pour les
-- transporter les marque d'abord "pris en charge" (ce DUT1 disparaît alors de
-- la liste "à transporter", cf. listPendingDelivery dans dut1Controller.js),
-- puis "livré" une fois arrivé en chambre (confirmLuggageDelivery, qui exige
-- désormais que la prise en charge ait déjà eu lieu). Même pattern que
-- luggage_delivered_at/by ci-dessus : NULL tant que non confirmé.
ALTER TABLE dut1_records
  ADD COLUMN IF NOT EXISTS luggage_picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS luggage_picked_up_by INTEGER REFERENCES users(id);

-- Renommage du sous-rôle Orga "chambres" en "logistique" : le nom reflète
-- mieux le travail réel (livrer, dans la chambre déjà assignée, les bagages
-- que l'agent "bagages" a photographiés — jamais configurer les chambres
-- elles-mêmes, cf. requireOrgaScope dans middleware/auth.js). Élargir
-- d'abord pour accepter les deux valeurs, migrer les lignes existantes, puis
-- resserrer : même prudence que pour users_role_check plus haut, on ne peut
-- pas resserrer une contrainte avant d'avoir migré les données qui
-- violeraient la nouvelle version.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sub_role_check;
ALTER TABLE users ADD CONSTRAINT users_sub_role_check
  CHECK (sub_role IN ('chambres','logistique','enregistrement','bagages','suivi','phase2','medoc'));
UPDATE users SET sub_role = 'logistique' WHERE sub_role = 'chambres';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sub_role_check;
ALTER TABLE users ADD CONSTRAINT users_sub_role_check
  CHECK (sub_role IN ('logistique','enregistrement','bagages','suivi','phase2','medoc'));

-- 10 départements à part entière : les options de Génie Informatique et de
-- GCBA deviennent des départements (dispatch des chambres, filtres et stats
-- les séparent). Correspondance : GI+INFO -> INFO, GI+ITR -> ITR,
-- GCBA+IA -> IA, GCBA+AB -> BA, GCBA+GC -> GCH (GC reste Génie Civil).
-- Les contraintes ont été élargies à l'union plus haut ; on migre puis on
-- resserre. GI sans option -> INFO (l'ancien import GI d'avant les options
-- était la liste Informatique) ; GCBA sans option -> GCH faute de mieux, pour
-- qu'un rejeu ne bloque jamais le déploiement. Les dossiers DUT1 n'ont jamais
-- porté l'option : on la reprend de l'admis associé.
UPDATE dut1_records d SET department = CASE
    WHEN d.department = 'GI' AND a.option_code = 'ITR' THEN 'ITR'
    WHEN d.department = 'GI' THEN 'INFO'
    WHEN a.option_code = 'IA' THEN 'IA'
    WHEN a.option_code = 'AB' THEN 'BA'
    ELSE 'GCH'
  END
FROM (SELECT d2.id, MAX(a2.option_code) AS option_code
      FROM dut1_records d2
      LEFT JOIN admitted_students a2 ON a2.matched_dut1_id = d2.id
      WHERE d2.department IN ('GI','GCBA')
      GROUP BY d2.id) a
WHERE d.id = a.id;
UPDATE admitted_students SET department = CASE
    WHEN department = 'GI' AND option_code = 'ITR' THEN 'ITR'
    WHEN department = 'GI' THEN 'INFO'
    WHEN option_code = 'IA' THEN 'IA'
    WHEN option_code = 'AB' THEN 'BA'
    ELSE 'GCH'
  END
WHERE department IN ('GI','GCBA');
ALTER TABLE dut1_records DROP CONSTRAINT IF EXISTS dut1_records_department_check;
ALTER TABLE dut1_records ADD CONSTRAINT dut1_records_department_check
  CHECK (department IN ('GC','GE','INFO','ITR','GM','IA','BA','GCH','GB','Gestion'));
ALTER TABLE admitted_students DROP CONSTRAINT IF EXISTS admitted_students_department_check;
ALTER TABLE admitted_students ADD CONSTRAINT admitted_students_department_check
  CHECK (department IN ('GC','GE','INFO','ITR','GM','IA','BA','GCH','GB','Gestion'));

-- Les colonnes importance / highlight / time_label ajoutées un temps pour la
-- timeline ne servent plus : on les retire pour garder le schéma propre.
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_importance_check;
ALTER TABLE activities DROP COLUMN IF EXISTS importance;
ALTER TABLE activities DROP COLUMN IF EXISTS highlight;
ALTER TABLE activities DROP COLUMN IF EXISTS time_label;
