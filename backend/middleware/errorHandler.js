function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route introuvable.' });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  // err.status n'est présent que pour les erreurs volontairement levées par le code
  // métier (ex: "Chambre déjà pleine.") — leur message est destiné à l'utilisateur.
  // Une erreur sans .status est une exception imprévue (bug, panne réseau/DB...) dont
  // le détail ne doit jamais fuiter côté client ; le message complet reste dans les logs.
  const message = err.status ? err.message || 'Erreur serveur.' : 'Erreur serveur.';
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
