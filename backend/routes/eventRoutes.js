const express = require('express');
const { verifyToken } = require('../middleware/auth');
const realtimeService = require('../services/realtimeService');

const router = express.Router();

// L'EventSource du navigateur ne sait pas poser d'en-tête Authorization : le
// jeton passe donc en query param, puis on le réinjecte dans l'en-tête pour
// réutiliser verifyToken tel quel (mêmes erreurs, même secret, zéro logique
// dupliquée). Le jeton n'apparaît dans aucun log d'audit — cette route ne
// journalise pas et le flux ne renvoie jamais de données sensibles, seulement
// le signal « des données ont changé ».
function verifyTokenFromQuery(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  req.headers.authorization = `Bearer ${token}`;
  return verifyToken(req, res, next);
}

router.get('/', verifyTokenFromQuery, (req, res) => {
  realtimeService.addClient(req, res);
});

module.exports = router;
