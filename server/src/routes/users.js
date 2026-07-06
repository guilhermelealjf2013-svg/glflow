const router = require('express').Router();
const { db, auth } = require('../config/firebase');
const { authenticate, authorize } = require('../middleware/auth');

const PUBLIC_FIELDS = ['id', 'name', 'registration', 'username', 'role',
                       'workload', 'loginTime', 'logoutTime', 'teamId', 'supervisorId'];

function pickPublic(id, data) {
  const obj = { id };
  PUBLIC_FIELDS.forEach(f => { if (f !== 'id' && data[f] !== undefined) obj[f] = data[f]; });
  return obj;
}

// List users
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = db.collection('users');

    if (role === 'SUPERVISOR') query = query.where('supervisorId', '==', id);
    else if (role === 'REPRESENTATIVE') query = query.where('__name__', '==', id);

    const snap = await query.get();
    res.json(snap.docs.map(d => pickPublic(d.id, d.data())));
  } catch (err) {
    console.error('GET /users:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Get single user with pauses
router.get('/:id', authenticate, async (req, res) => {
  try {
    const snap = await db.collection('users').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Usuário não encontrado' });

    const pausesSnap = await db.collection('pauses')
      .where('representativeId', '==', req.params.id).get();
    const pauses = pausesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ ...pickPublic(snap.id, snap.data()), pauses });
  } catch (err) {
    console.error('GET /users/:id:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Create user (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, registration, username, password, role,
            workload, loginTime, logoutTime, teamId, pauses } = req.body;

    if (role === 'REPRESENTATIVE' && !['SIX_TWENTY', 'EIGHT_TWELVE'].includes(workload)) {
      return res.status(400).json({ error: 'Carga horária inválida' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
    }

    const fbUser = await auth.createUser({
      email: `${username}@glflow.com`,
      password,
      displayName: name,
    });

    const profile = {
      name, registration, username, role,
      workload: workload || null,
      loginTime: loginTime || null,
      logoutTime: logoutTime || null,
      teamId: teamId || null,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(fbUser.uid).set(profile);

    if (pauses?.length) {
      const batch = db.batch();
      pauses.forEach(p => {
        const ref = db.collection('pauses').doc();
        batch.set(ref, { representativeId: fbUser.uid, label: p.label,
                         startTime: p.startTime, endTime: p.endTime,
                         isTemplate: true, date: '2099-01-01' });
      });
      await batch.commit();
    }

    res.status(201).json(pickPublic(fbUser.uid, profile));
  } catch (err) {
    console.error('POST /users:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Nome de usuário já existe' });
    }
    if (err.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Senha inválida (mínimo 6 caracteres)' });
    }
    res.status(500).json({ error: err.message || 'Erro ao criar usuário' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { password, pauses, ...data } = req.body;
    // Remove fields that shouldn't be stored or are read-only
    delete data.id;
    delete data.firebaseUid;
    delete data.email;

    // Build Firebase Auth update payload
    const authUpdate = {};
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
      }
      authUpdate.password = password;
    }
    if (data.username) {
      authUpdate.email = `${data.username}@glflow.com`;
    }
    if (Object.keys(authUpdate).length) {
      await auth.updateUser(req.params.id, authUpdate);
    }

    // Only persist known profile fields
    const allowed = ['name', 'registration', 'username', 'role', 'workload', 'loginTime', 'logoutTime', 'teamId', 'supervisorId'];
    const update = {};
    allowed.forEach(f => { if (data[f] !== undefined) update[f] = data[f] ?? null; });

    await db.collection('users').doc(req.params.id).update(update);

    if (pauses) {
      const existing = await db.collection('pauses')
        .where('representativeId', '==', req.params.id)
        .where('isTemplate', '==', true).get();
      const batch = db.batch();
      existing.docs.forEach(d => batch.delete(d.ref));
      pauses.forEach(p => {
        const ref = db.collection('pauses').doc();
        batch.set(ref, { representativeId: req.params.id, label: p.label,
                         startTime: p.startTime, endTime: p.endTime,
                         isTemplate: true, date: '2099-01-01' });
      });
      await batch.commit();
    }

    const updated = await db.collection('users').doc(req.params.id).get();
    res.json(pickPublic(req.params.id, updated.data()));
  } catch (err) {
    console.error('PUT /users/:id:', err);
    if (err.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Senha inválida (mínimo 6 caracteres)' });
    }
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuário' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await Promise.all([
      auth.deleteUser(req.params.id),
      db.collection('users').doc(req.params.id).delete(),
    ]);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /users/:id:', err);
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

module.exports = router;
