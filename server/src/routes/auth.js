const router = require('express').Router();
// Firebase Auth login é feito no cliente com o SDK do Firebase.
// Este endpoint é mantido apenas para compatibilidade: retorna o perfil
// do usuário a partir do Firestore usando o ID token já validado.
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

module.exports = router;
