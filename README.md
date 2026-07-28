# Plateforme d'intégration DUT1 — ESP Dakar

Application de gestion de la semaine d'intégration des nouveaux étudiants (DUT1) :
enregistrement des dossiers en deux phases, prise en charge des bagages par
l'équipe logistique, attribution automatique des chambres, et back-office admin
(statistiques, dossiers, chambres, comptes agents).

## Stack

- **Backend** : Node.js / Express 5, SQLite (`better-sqlite3`), JWT + bcrypt, uploads via `multer`.
- **Frontend** : React 19 + Vite, Tailwind CSS v4, React Router, Recharts.

## Installation

```bash
cd backend
npm install
cp .env.example .env
node db/migrate.js
node db/seed.js
```

Le script de seed crée un compte admin par défaut (voir `.env` :
`DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`) ainsi que quelques chambres
de test. **Changez le mot de passe admin en production.**

```bash
cd frontend
npm install
```

## Lancement en développement

Dans deux terminaux séparés :

```bash
# Terminal 1 — API
cd backend
npm run dev
```

```bash
# Terminal 2 — interface
cd frontend
npm run dev
```

Le frontend (http://localhost:5173) proxifie automatiquement `/api` et
`/uploads` vers le backend (http://localhost:3000).

## Rôles

- **Agent enregistreur** (`registrar`) : saisit les fiches DUT1 (phase 1 —
  infos de base) et complète les fiches en phase 2 (infos complémentaires,
  dont les allergies).
- **Commission Orga** (`logistics`) : photographie les bagages des DUT1 déjà
  enregistrés (phase 1 suffit), optimisé pour mobile.
- **Commission Santé** (`sante`) : consulte les DUT1 à risque selon le menu du
  jour (croisement allergies × allergènes des plats), déclare/consulte
  l'historique de maladie des DUT1, et gère la liste des allergènes.
- **Commission Cuisine** (`cuisine`) : saisit le menu du jour (petit-déjeuner/
  déjeuner/dîner) et les allergènes potentiels de chaque plat.
- **Admin** (`admin`) : tableau de bord, gestion des dossiers, des chambres et
  des comptes agents. Seul l'admin peut créer des comptes, gérer les chambres
  et réassigner manuellement une chambre. Il a aussi accès à toutes les pages
  des autres rôles.

Les comptes agents sont créés depuis **Admin → Agents**. Le script de seed
crée aussi 4 comptes de test (mot de passe `pass123`) : `registrar1`,
`logistics1`, `sante1`, `cuisine1`.

## Allergies et sécurité alimentaire

- La liste des allergènes (14 majeurs par défaut) est gérée par la commission
  Santé depuis **Santé → Allergènes**.
- Les allergies d'un DUT1 sont sélectionnées (pas de texte libre) lors de la
  phase 2 du formulaire d'enregistrement.
- La commission Cuisine associe des allergènes à chaque plat du menu du jour
  (**Cuisine → Menu du jour**).
- La commission Santé consulte automatiquement les DUT1 dont une allergie
  correspond à un allergène du menu de la date sélectionnée
  (**Santé → Risques du jour**), pour les faire sortir des rangs avant le
  service concerné.

## Configuration des questions de phase 2

La liste des champs complémentaires génériques (personnalité, etc. — hors
allergies, qui sont structurées) n'est pas figée : elle se configure dans
[`frontend/src/utils/dut1ComplementaryFields.js`](frontend/src/utils/dut1ComplementaryFields.js).
Ajouter/retirer un champ ne nécessite aucune migration de base de données (les
réponses sont stockées en JSON libre).

## Chambres

Les chambres (numéro, genre, capacité, bâtiment) se configurent entièrement
depuis **Admin → Chambres**. L'attribution à la création d'un dossier est
automatique (première chambre disponible du bon genre) ; l'admin peut
réassigner manuellement depuis **Admin → Dossiers**.

## Déploiement sur Render (préprod)

L'app est déployée comme **un seul service web** : au démarrage en
production, le backend Express sert directement les fichiers statiques du
frontend buildé (`frontend/dist`) en plus de l'API — pas de second service,
pas de CORS à configurer. C'est le fichier [`render.yaml`](render.yaml) à la
racine qui décrit ce service (Render le détecte automatiquement via
"New → Blueprint").

### ⚠️ Important : stockage éphémère sur le plan gratuit

Le plan `free` de Render n'a pas de disque persistant : à chaque redéploiement
ou redémarrage (veille après 15 min d'inactivité sur le plan gratuit), le
fichier SQLite et les photos de bagages sont perdus — `seed.js` recrée
automatiquement l'admin, les chambres et les allergènes de test au
redémarrage, mais **tous les dossiers DUT1 créés pendant une démo seront
réinitialisés à la prochaine veille/déploiement**. C'est suffisant pour une
démo ponctuelle ; pour une préprod où les données doivent survivre entre deux
sessions, voir la section "Passer en préprod persistante" ci-dessous.

### Étapes

1. **Pousser le code sur GitHub** (Render déploie depuis un repo Git) :
   ```bash
   git add -A
   git commit -m "Initial commit"
   git remote add origin <url-de-ton-repo-github>
   git push -u origin main
   ```
2. Sur [render.com](https://render.com), **New → Blueprint**, connecter le
   repo GitHub — Render lit `render.yaml` et propose de créer le service
   `integration-dut1` automatiquement.
3. Render va demander de renseigner les variables marquées `sync: false` :
   - `DEFAULT_ADMIN_PASSWORD` : choisis un mot de passe fort pour le compte
     admin de la démo (`JWT_SECRET` est généré automatiquement par Render,
     pas besoin d'y toucher).
4. Cliquer **Apply** — Render build (`npm install` + `npm run build` du
   frontend), exécute `migrate.js`/`seed.js` en pré-déploiement, puis démarre
   le serveur. L'app est accessible à l'URL `https://integration-dut1.onrender.com`
   (ou le nom choisi).
5. Se connecter avec `admin` / le mot de passe défini à l'étape 3, puis créer
   les comptes des commissions depuis **Admin → Agents** (ou utiliser les
   comptes de test `registrar1`/`logistics1`/`sante1`/`cuisine1`, mot de passe
   `pass123`, créés par le seed — à changer si la démo doit être partagée
   publiquement).

### Passer en préprod persistante (données conservées entre les démos)

Dans `render.yaml`, passer `plan: free` à `plan: starter` (~7$/mois) et
décommenter le bloc `disk` ainsi que le second bloc `envVars` en bas du
fichier (qui pointe `DB_PATH`/`UPLOAD_DIR` vers le disque monté) — les
commentaires dans le fichier indiquent exactement quoi activer. Un plan payant
supprime aussi la mise en veille après inactivité (pas de temps de démarrage
à froid pendant une démo client).
