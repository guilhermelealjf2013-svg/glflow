const router = require('express').Router();
const { db } = require('../config/firebase');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (_req, res) => {
  const snap = await db.collection('teams').get();
  const teams = await Promise.all(snap.docs.map(async d => {
    const team = { id: d.id, ...d.data() };
    const membersSnap = await db.collection('users').where('teamId', '==', d.id).get();
    team.members = membersSnap.docs.map(m => ({
      id: m.id, name: m.data().name, role: m.data().role, workload: m.data().workload,
    }));
    return team;
  }));
  res.json(teams);
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, supervisorId } = req.body;
  const ref = await db.collection('teams').add({ name, supervisorId: supervisorId || null });
  res.status(201).json({ id: ref.id, name, supervisorId });
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, supervisorId } = req.body;
  await db.collection('teams').doc(req.params.id).update({ name, supervisorId });
  res.json({ id: req.params.id, name, supervisorId });
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  await db.collection('teams').doc(req.params.id).delete();
  res.status(204).end();
});

module.exports = router;
