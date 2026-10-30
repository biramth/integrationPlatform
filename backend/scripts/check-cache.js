// Verifie le cache en memoire sans base de donnees ni reseau : TTL, invalidation
// par prefixe, coalescence des requetes simultanees, protection contre une
// reponse calculee AVANT une invalidation, et cles isolees par role/sous-role.
//
// Usage (depuis backend/) : npm run check:cache
//
// A relancer apres toute modification de middleware/cache.js ou apres avoir
// ajoute un `cached(...)` a une route : c'est ce qui garantit qu'une salve
// temps reel ne sert jamais une reponse perimee.
const cache = require('../middleware/cache');

let failures = 0;
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`OK    ${name}`);
    return;
  }
  failures += 1;
  console.log(`ECHEC ${name}${detail ? ` — ${detail}` : ''}`);
}

function makeReq(query = {}) {
  return { baseUrl: '/api/phase2-questions', path: '/', query, user: { role: 'sante', subRole: null } };
}

function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    handlers: [],
    json(body) {
      this.body = body;
      return this;
    },
    on(event, fn) {
      this.handlers.push([event, fn]);
      return this;
    },
  };
}

async function run() {
  // 1. Deux appels identiques : le second est servi par le cache.
  let calls = 0;
  const controller = (req, res) => {
    calls += 1;
    res.json({ questions: ['q'], call: calls });
  };
  const mw = cache.cached(60_000);

  const req1 = makeReq();
  const res1 = makeRes();
  mw(req1, res1, () => controller(req1, res1));
  const req2 = makeReq();
  const res2 = makeRes();
  mw(req2, res2, () => controller(req2, res2));
  check('2e appel servi par le cache (aucun recalcul)', calls === 1, `appels=${calls}`);
  check('la reponse en cache est identique', res2.body?.call === 1);

  // 2. L'invalidation par prefixe vide bien la cle et force un recalcul.
  cache.invalidate('/api/phase2-questions');
  const req3 = makeReq();
  const res3 = makeRes();
  mw(req3, res3, () => controller(req3, res3));
  check('apres invalidate(prefixe), la liste est recalculee', calls === 2, `appels=${calls}`);

  // 3. Un autre prefixe ne doit pas vider cette cle.
  const req4 = makeReq();
  const res4 = makeRes();
  mw(req4, res4, () => controller(req4, res4));
  cache.invalidate('/api/health');
  const req5 = makeReq();
  const res5 = makeRes();
  mw(req5, res5, () => controller(req5, res5));
  check("invalidate d'un autre prefixe ne touche pas la liste", calls === 2, `appels=${calls}`);

  // 4. Deux requetes simultanees sur une cle froide : un seul calcul.
  const before = calls;
  const reqA = makeReq({ page: '2' });
  const reqB = makeReq({ page: '2' });
  const resA = makeRes();
  const resB = makeRes();
  let slowCalls = 0;
  const slow = (req, res) => {
    slowCalls += 1;
    setTimeout(() => res.json({ delayed: true, call: slowCalls }), 30);
  };
  const mwSlow = cache.cached(60_000);
  mwSlow(reqA, resA, () => slow(reqA, resA));
  mwSlow(reqB, resB, () => slow(reqB, resB));
  await new Promise((r) => setTimeout(r, 80));
  check('2 requetes simultanees = 1 seul calcul (coalescence)', slowCalls === 1, `calculs=${slowCalls}`);
  check('les deux reponses sont servies', Boolean(resA.body && resB.body));
  check('le compteur global n’a pas bouge', calls === before);

  // 5. Reponse calculee AVANT une invalidation : jamais mise en cache.
  const key = cache.cacheKey(makeReq({ race: '1' }));
  const reqSlow = makeReq({ race: '1' });
  const resSlow = makeRes();
  const mwRace = cache.cached(60_000);
  mwRace(reqSlow, resSlow, () => {
    setTimeout(() => resSlow.json({ stale: true }), 50);
  });
  cache.invalidateAll(); // survient pendant le calcul
  await new Promise((r) => setTimeout(r, 100));
  check('une reponse en vol pendant une invalidation n’est pas mise en cache', cache.get(key) === undefined);

  // 6. Les cles distinguent le role : pas de fuite entre un compte medical et un autre.
  cache.invalidateAll();
  const keyOrga = cache.cacheKey({ baseUrl: '/api/dut1', path: '/', query: {}, user: { role: 'orga', subRole: null } });
  const keyComm = cache.cacheKey({ baseUrl: '/api/dut1', path: '/', query: {}, user: { role: 'communication', subRole: null } });
  const keySanteSuivi = cache.cacheKey({ baseUrl: '/api/health/treatments', path: '/', query: {}, user: { role: 'sante', subRole: 'suivi' } });
  const keySantePhase2 = cache.cacheKey({ baseUrl: '/api/health/treatments', path: '/', query: {}, user: { role: 'sante', subRole: 'phase2' } });
  check('la cle depend du role', keyOrga !== keyComm);
  check('la cle depend du sous-role', keySanteSuivi !== keySantePhase2);
  check('la cle depend de la query', cache.cacheKey(makeReq({ date: '2026-10-30' })) !== cache.cacheKey(makeReq({ date: '2026-10-31' })));

  // 7. Expiration
  cache.set('test:ttl', 42, 20);
  await new Promise((r) => setTimeout(r, 40));
  check('une entree expiree n’est plus servie', cache.get('test:ttl') === undefined);

  console.log(failures === 0 ? '\nToutes les verifications passent.' : `\n${failures} verification(s) en echec.`);
  process.exit(failures === 0 ? 0 : 1);
}

run();
