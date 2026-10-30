// Résolution du jeton d'authentification pour les scripts de charge
// (loadtest.js, loadtest-sse.js) : soit fourni directement via --token, soit
// obtenu par une vraie connexion /api/auth/login avec un compte de test.
//
// Aucun mot de passe n'est jamais journalisé, et le script n'écrit rien en base
// (la connexion est une simple lecture du compte + vérification bcrypt).

async function resolveToken({ apiUrl, token, username, password }) {
  if (token) {
    return { token, source: 'argument --token' };
  }

  const user = username || process.env.LOADTEST_USERNAME;
  const pass = password || process.env.LOADTEST_PASSWORD;
  if (!user || !pass) return null;

  const base = apiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error ? ` — ${body.error}` : '';
    } catch {
      // réponse non JSON : on garde juste le statut
    }
    throw new Error(`Connexion échouée pour "${user}" (HTTP ${res.status})${detail}`);
  }

  const body = await res.json();
  if (!body.token) {
    throw new Error('Réponse de connexion sans jeton : le compte existe-t-il et est-il actif ?');
  }
  return { token: body.token, source: `connexion ${user}` };
}

// Décode la charge utile d'un JWT sans vérifier la signature : uniquement pour
// adapter le scénario de test au rôle du compte (le serveur, lui, vérifie tout).
function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

module.exports = { resolveToken, decodeJwtPayload };
