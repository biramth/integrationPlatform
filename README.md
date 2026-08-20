# Plateforme d'intégration DUT1 — ESP Dakar

Application de gestion de la semaine d'intégration des nouveaux étudiants (DUT1) :
enregistrement des dossiers en deux phases, prise en charge des bagages par
l'équipe logistique, attribution automatique des chambres, et back-office admin
(statistiques, dossiers, chambres, comptes agents).

## Stack

- **Backend** : Node.js / Express 5, Postgres (Supabase), JWT + bcrypt, uploads via `multer` vers Supabase Storage.
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

Le frontend (http://localhost:5173) proxifie automatiquement `/api` vers le
backend (http://localhost:3000).

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

## Déploiement : frontend sur Vercel, API sur Render

L'app est déployée en **deux services séparés** :

| Service | Hébergeur | Contenu |
| --- | --- | --- |
| Frontend | Vercel | build Vite statique (`frontend/dist`), servi par le CDN |
| API | Render | serveur Express (`backend/`), décrit par [`render.yaml`](render.yaml) |
| Données | Supabase | Postgres + bucket privé pour les photos de bagages |

Pourquoi séparer : le CDN Vercel sert le HTML/JS/CSS depuis un point de
présence proche de l'utilisateur, avec un cache immuable d'un an sur
`/assets/*` (les noms de fichiers sont hashés) — donc plus aucun octet de
frontend ne transite par Render après le premier chargement. Render ne
build plus que le backend, ce qui raccourcit nettement les déploiements, et
ses réponses JSON sont désormais gzippées (`compression`).

### 1. Backend sur Render

1. Sur [render.com](https://render.com), **New → Blueprint**, connecter le
   repo GitHub — Render lit `render.yaml` et crée le service
   `integration-dut1-api`.
2. Renseigner les variables marquées `sync: false` :
   - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (projet Supabase)
   - `DEFAULT_ADMIN_PASSWORD` : mot de passe du compte admin initial
   - `CORS_ORIGIN` : laisser vide pour ce premier déploiement, on le remplira
     à l'étape 3 une fois l'URL Vercel connue.
   (`JWT_SECRET` est généré automatiquement par Render.)
3. **Apply** — le build installe les dépendances backend puis exécute
   `migrate.js` / `setupStorage.js` / `seed.js` (tous idempotents). L'API
   répond ensuite sur `https://integration-dut1-api.onrender.com`, avec une
   sonde de santé sur `/healthz`.

### 2. Frontend sur Vercel

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importer le
   même repo GitHub.
2. Régler **Root Directory** sur `frontend` — Vercel détecte Vite et lit
   [`frontend/vercel.json`](frontend/vercel.json) (build, réécriture SPA vers
   `index.html`, cache des assets).
3. Ajouter la variable d'environnement `VITE_API_URL` avec l'origine du
   backend Render, **sans `/api` ni slash final** :
   `https://integration-dut1-api.onrender.com`
4. **Deploy**.

### 3. Refermer le CORS

Une fois l'URL Vercel connue, retourner dans les variables d'environnement du
service Render et poser :

```
CORS_ORIGIN=https://integration-dut1.vercel.app,*.vercel.app
```

La première entrée est le domaine de production ; `*.vercel.app` autorise en
plus les URLs de preview générées à chaque PR (à retirer si l'on veut
verrouiller strictement). Une origine non listée reçoit un `403`. Tant que
`CORS_ORIGIN` est vide, l'API accepte toutes les origines — pratique en local,
à ne pas laisser ainsi en production.

### ⚠️ Veille du plan gratuit Render

Le plan `free` met le service en veille après 15 min d'inactivité : la
première requête suivante attend ~50 s le temps du redémarrage (les données,
elles, sont sur Supabase et ne sont jamais perdues). Le frontend Vercel, lui,
reste instantané — l'utilisateur voit donc l'interface tout de suite mais
attend sur le premier appel API. Deux façons d'y remédier :

- le workflow [`keepalive.yml`](.github/workflows/keepalive.yml) s'en charge
  déjà : il ping `/healthz` toutes les 10 min, 24h/24, depuis GitHub Actions
  (gratuit), donc l'API reste chaude sans service externe. Ça réduit très
  fortement le risque de veille mais ne l'élimine pas à 100 % (un run en
  retard reste possible sur un cron). Pour l'arrêter hors période
  d'intégration : **Actions → Keep-alive API → « … » → Disable workflow** ;
- passer Render en plan `starter` (~7 $/mois) : seule option qui supprime la
  veille avec certitude.

La région du service Render ne peut pas être changée après création : pour un
public ouest-africain, créer le service en **Frankfurt** (ligne `region`
commentée dans `render.yaml`) plutôt que dans une région américaine.

### Mise à jour de la production

Il n'y a rien à faire à la main : **un `git push` sur `main` met la production
à jour des deux côtés.** Vercel redéploie via son intégration Git et Render
via `autoDeploy: true` dans [`render.yaml`](render.yaml) — les deux écoutent
le même push, en parallèle (`ci.yml` vérifie en plus que le frontend build et
que le backend s'installe proprement). Les migrations (`migrate.js`,
`seed.js`) sont idempotentes et rejouées à chaque déploiement sans toucher aux
données.

**Revenir en arrière** : `Deployments → Rollback` sur Render, `Deployments →
Promote to Production` sur un déploiement précédent côté Vercel.

### Développement local

Rien ne change : `VITE_API_URL` reste vide, et le proxy de
[`vite.config.js`](frontend/vite.config.js) envoie `/api` vers
`http://localhost:3000`.
