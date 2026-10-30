# Mesurer la charge et les performances

Ce dossier contient trois scripts de mesure **en lecture seule**, à utiliser
avant et après chaque optimisation. L'objectif est de savoir où part le temps
(SQL, réseau, Node, SSE) au lieu de modifier l'architecture à l'aveugle.

| Script | Ce qu'il mesure | Prérequis |
| --- | --- | --- |
| `bench-queries.js` | coût réel des requêtes SQL chaudes, sans HTTP | `DATABASE_URL` |
| `loadtest.js` | débit et latence HTTP des écrans fréquentés (autocannon) | API démarrée + compte de test |
| `loadtest-sse.js` | nombre de connexions temps réel tenues, temps d'établissement, coupures | API démarrée + compte de test |

Les trois acceptent `--help` et `--json` (sortie exploitable pour comparer
avant/après).

## Sécurité

- **Aucune écriture** : `bench-queries` ouvre une transaction `READ ONLY`,
  `loadtest` et `loadtest-sse` ne font que des `GET`.
- **Compte dédié** : créez un compte de test par rôle plutôt que d'utiliser un
  vrai compte agent. Les tests HTTP consomment la limite de
  **5 000 requêtes / 15 min par compte** (`server.js`) ; un `429` signifie
  qu'elle est atteinte, pas que le serveur est lent.
- `loadtest` s'arrête de lui-même avant `--max-total` (4 000 par défaut) pour
  ne pas épuiser cette limite.
- **Pas pendant une vraie session** : évitez d'exécuter les tests pendant un
  import Excel, une salve d'enregistrements ou la première heure d'intégration.
- En production, restez sur des charges courtes et hors pointe. Le premier
  appel peut inclure un cold start Render (~50 s) : les scripts échauffent
  chaque endpoint une fois avant de mesurer, mais un test local ne reproduit
  pas ce cold start.
- Ne collez pas de mot de passe dans l'historique du shell : préférez
  `LOADTEST_USERNAME` / `LOADTEST_PASSWORD` (voir plus bas). Les scripts
  n'affichent jamais le jeton ni le mot de passe.

## Préparation

```powershell
cd backend
npm install                 # installe aussi autocannon (devDependency)
```

Pour `bench-queries`, `backend/.env` doit contenir `DATABASE_URL` (cf.
`.env.example`). On peut aussi passer la chaîne directement :
`--url=postgresql://…`.

Pour les tests HTTP, démarrez l'API en local :

```powershell
npm run dev                 # http://localhost:3000
```

Créez au besoin des comptes de test depuis **Admin → Agents** : un compte `it`,
un `orga`, un `sante` sous-rôle `suivi`, un `sante` sous-rôle `phase2`, un
`presidentielle`. Le scénario d'endpoints est choisi automatiquement selon le
rôle du jeton.

## Commandes

### 1. Requêtes SQL

```powershell
# Mesure standard (30 itérations après 3 échauffements)
npm run bench:queries

# Une ligne par requête SQL, pour trouver la requête coupable
npm run bench:queries -- --detail

# Sauvegarde pour comparaison avant/après
npm run bench:queries -- --json > ..\bench-before.json
```

Le script compare notamment :

- `stats/overview` **actuel** (5 allers-retours) vs **consolidé** (1 requête) ;
- `stats/health-overview` **actuel** (7 allers-retours) vs **consolidé** ;
- la liste paginée `/api/dut1` (`COUNT` + page), le détail d'un dossier ;
- les listes Santé : restrictions actives, sous traitement, traitements actifs,
  risques du jour ;
- allergènes, activités, questions phase 2.

### 2. Charge HTTP

```powershell
$env:LOADTEST_USERNAME = 'agent-test-orga'
$env:LOADTEST_PASSWORD = '…'

# Local : 200 requêtes par endpoint, 5 connexions
npm run loadtest -- --url=http://localhost:3000

# Production : charge volontairement plus légère
npm run loadtest -- --url=https://integration-dut1-api.onrender.com --requests=50 --connections=3

# Cibler un seul endpoint ou sauvegarder les résultats
npm run loadtest -- --endpoints=/api/dut1 --requests=100
npm run loadtest -- --json > ..\http-before.json
```

Options utiles : `--token=…` (au lieu du login), `--requests`, `--connections`,
`--duration` (plafond de temps par endpoint), `--max-total`, `--date`.

### 3. Capacité SSE

```powershell
# 20 connexions maintenues 30 s
npm run loadtest:sse -- --url=http://localhost:3000 --connections=20 --duration=30

# Production, prudemment
npm run loadtest:sse -- --url=https://integration-dut1-api.onrender.com --connections=15 --duration=30
```

Le flux est quasi vide (quelques octets par mutation, heartbeat toutes les
25 s) : ce qui compte est le **nombre de connexions tenues** et l'absence de
coupure, pas les octets.

## Comment lire les résultats

### SQL (`bench-queries`)

| p95 | Interprétation |
| --- | --- |
| < 50 ms | correct pour un aller-retour Supabase depuis la même région |
| 50–150 ms | acceptable, à surveiller sur les écrans rechargés souvent |
| > 200 ms | point chaud : requête à optimiser, index manquant ou région Supabase éloignée |

Les chiffres absolus dépendent de votre machine et de la distance au pooler
Supabase : raisonnez surtout en **ratio** entre deux mesures. Regardez d'abord
les scénarios « actuel » vs « consolidé » : si le consolidé divise le temps par
5–7, le problème est bien le nombre d'allers-retours.

### HTTP (`loadtest`)

- `p50` stable et `p99` proche de `p50` : serveur fluide.
- `p99` qui explose avec peu de connexions : blocage de l'event loop, requête
  SQL lente ou cold start — pas seulement un manque de CPU.
- `429` : limite par compte atteinte ; attendez 15 min et relancez avec moins de
  requêtes.
- Rappel : `/api/dut1` est mis en cache 15 s, les stats 30–60 s. Un test HTTP
  mesure donc surtout le **chemin cache chaud** ; le coût SQL réel est dans
  `bench-queries`.

### SSE (`loadtest:sse`)

- Toutes les connexions doivent s'établir (`établies = demandées`).
- `coupures prématurées > 0` : le serveur, le proxy ou la limite de descripteurs
  ne tient pas la charge.
- Un p95 d'établissement qui croît fortement avec `--connections` indique une
  saturation CPU/socket côté Render.
- Sur un maintien > 25 s, des `heartbeat` doivent apparaître : c'est la preuve
  que le flux reste ouvert.

## Protocole avant/après

1. **Figer le point de départ** : notez `git rev-parse --short HEAD`, le plan et
   la région Render, la région Supabase, et sauvegardez les JSON.
2. **Réveiller l'API** : appelez `/healthz` deux fois, puis lancez les tests.
3. **Mêmes conditions** : même compte, même rôle, mêmes options, même moment de
   la journée, même réseau (évitez de comparer un test en 4G et un test filaire).
4. **Répéter 3 fois** chaque mesure et garder la **médiane** des p50/p95 et du
   débit ; un pic isolé n'est pas une régression.
5. **Un seul changement à la fois**, puis re-mesurer. Si vous changez à la fois
   le cache, les requêtes et le plan Render, vous ne saurez pas ce qui a gagné.
6. **Vérifier l'équivalence fonctionnelle** : une requête consolidée doit
   renvoyer exactement les mêmes compteurs que les requêtes séparées. Comparez
   les réponses de l'ancien et du nouveau code sur les mêmes données.

Gabarit de suivi :

| Date | Commit | Scénario | Avant (p50/p95) | Après (p50/p95) | Gain | Remarque |
| --- | --- | --- | --- | --- | --- | --- |
| … | … | `stats/overview` SQL | … | … | … | … |
| … | … | `/api/dut1` HTTP | … | … | … | … |
| … | … | SSE 20 connexions | … | … | … | … |

## Limites connues

- Ce n'est pas un test navigateur : pas de rendu React, pas de CDN Vercel, pas
  de HTTP/2. Il mesure l'API seule.
- Depuis un poste local, la latence Supabase inclut votre distance au pooler ;
  depuis Render (Francfort), elle sera différente. Utilisez les mesures locales
  pour comparer des **requêtes entre elles**, pas pour prédire la latence
  absolue en production.
- `bench-queries` exécute de vraies requêtes : gardez `--iterations` modéré sur
  la base de production.
- Le plan gratuit Render (0,1 CPU, une instance) plafonne vite : un débit
  modeste en test n'est pas un bug de l'application.

## Après la mesure

Les optimisations candidates sont documentées dans le README et le bilan de
performance : consolidation des stats, index manquants, invalidation de cache
par ressource, filtrage des événements SSE, compression d'image côté client et
passage éventuel de Render en `starter`. Ne les appliquez qu'après avoir
identifié le goulot avec ces scripts, et re-mesurez après chaque changement.
