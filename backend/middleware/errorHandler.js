function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route introuvable.' });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  // Gestion dédiée des erreurs d'upload Multer
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'La photo est trop volumineuse. La taille maximale autorisée est de 20 Mo.',
      });
    }
    return res.status(400).json({
      error: `Erreur lors du transfert du fichier : ${err.message}`,
    });
  }

  // Filtrage du type de fichier (fileFilter dans upload.js)
  if (err.message && err.message.includes('Seuls les fichiers image sont acceptés')) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  // err.status n'est présent que pour les erreurs volontairement levées par le code
  // métier (ex: "Chambre déjà pleine.") — leur message est destiné à l'utilisateur.
  // Une erreur sans .status est une exception imprévue (bug, panne réseau/DB...) dont
  // le détail ne doit jamais fuiter côté client ; le message complet reste dans les logs.
  const message = err.status ? err.message || 'Erreur serveur.' : 'Erreur serveur.';
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
