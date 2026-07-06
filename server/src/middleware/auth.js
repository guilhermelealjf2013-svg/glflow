const { auth, db } = require('../config/firebase');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const idToken = header.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken);
    // Enrich with Firestore profile (role, teamId, etc.)
    const snap = await db.collection('users').doc(decoded.uid).get();
    if (!snap.exists) return res.status(401).json({ error: 'Perfil de usuário não encontrado' });
    req.user = { id: decoded.uid, ...snap.data() };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
