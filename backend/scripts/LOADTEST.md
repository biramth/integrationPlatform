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

# Mesurer le chemin « cache froid » (miss systématique) : le paramètre --bust
# ajoute une query string unique à chaque requête, donc aucun résultat ne peut
# être resservi par le cache ni mutualisé entre requêtes simultanées
npm run loadtest -- --endpoints=/api/stats/overview --requests=20 --connections=2 --bust
```

`--bust` est le seul moyen d'obtenir un avant/après reproductible sur une
optimisation de requêtes : sans lui, un test peut tomber sur un cache chaud et
masquer complètement le gain. Il est beaucoup plus lent (chaque requête paie le
coût SQL complet) : gardez `--requests` bas et pensez à `--duration`.

Options utiles : `--token=…` (au lieu du login), `--requests`, `--connections`,
`--duration` (le test s'arrête au premier des deux objectifs, nombre de requêtes
ou durée), `--bust`, `--max-total`, `--date`.

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
  mesure donc surtout le **chemin cache chaud** ; ajoutez `--bust` pour mesurer
  le chemin cache froid, et `bench-queries` pour le coût SQL isolé.

### SSE (`loadtest:sse`)

- Toutes les connexions doivent s'établir (`établies = demandées`).
- `coupures prématurées > 0` : le serveur, le proxy ou la limite de descripteurs
  ne tient pas la charge.
- Un p95 d'établissement qui croît fortement avec `--connections` indique une
  saturation CPU/socket côté Render.
- Sur un maintien > 25 s, des `heartbeat` doivent apparaître : c'est la preuve
  que le flux reste ouvert.

## Point de départ mesuré (30/10/2026)

Relevé sur `https://integration-dut1-api.onrender.com` (plan gratuit, une
instance, Supabase distant) depuis un poste en France, 5 connexions et
200 requêtes/endpoint sauf mention contraire. La latence réseau de ce poste vers
Render est d'environ **215 ms par requête** : ces chiffres servent de référence
relative, pas de cible absolue.

| Mesure | p50 | p99 | Remarque |
| --- | --- | --- | --- |
| `/healthz` (1 puis 10 connexions) | 217 / 221 ms | 365 / 410 ms | endpoint sans SQL, plancher réseau + Node |
| `/api/stats/overview` cache chaud | 486 ms | 652 ms | 10 requêtes, 1 connexion |
| `/api/stats/overview` cache froid (`--bust`) | 1 094 ms | 1 372 ms | 5 `COUNT` séquentiels |
| `/api/dut1` cache chaud / froid | 346 / 592 ms | 443 / 889 ms | liste paginée |
| `/api/activities` cache chaud / froid | 611 / 829 ms | 657 / 863 ms | ~26 Ko de réponse |
| `/api/health/risks` | 1 077 ms | 1 290 ms | jamais mis en cache |
| `/api/stats/health-overview` | 470 ms | 718 ms | 7 `COUNT` séquentiels |
| Santé : restrictions / traitements | ~710 ms | ~900 ms | |
| `/api/phase2-questions` | 725 ms | 2 784 ms | p99 instable |
| SSE 20 / 40 connexions | 645 / 1 412 ms | 1 300 / 1 643 ms | 0 coupure, heartbeats reçus |

Lecture : hors ~215 ms de réseau incompressible, les écrans lents sont ceux qui
enchaînent des allers-retours SQL (`stats/*`, `health/risks`) et non ceux qui
transfèrent beaucoup d'octets.

Repère utile : `/healthz` ne fait aucune requête SQL. Après l'optimisation de
`verifyToken`, les endpoints **servis par le cache** doivent tomber au niveau de
`/healthz` (~225 ms avec 1 connexion). S'ils restent nettement au-dessus, c'est
qu'ils repaient un aller-retour base. Pour isoler le coût d'un contrôleur, on
peut donc comparer son p50 à celui de `/healthz` plutôt qu'au p50 brut.

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
| 30/10/2026 | `a4d5f61` | `health/risks` HTTP, 5 conn. | 1 077 / 1 250 ms | 866 / 1 193 ms | −20 % | requêtes indépendantes parallélisées (5 vagues → 2) |
| 30/10/2026 | `bf25b7f` | endpoints en cache, 1 conn. | 346 / 486 / 611 ms | 226 / 230 / 234 ms | −35 à −62 % | lecture `users` de `verifyToken` mémorisée 15 s (plancher `/healthz` = 225 ms) |
| 30/10/2026 | `bf25b7f` | `health/risks` 1 conn. + `stats/overview` à froid | 866 / 1 094 ms | 479 / 841 ms | −45 % / −23 % | même changement : un aller-retour de moins avant le contrôleur |
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
