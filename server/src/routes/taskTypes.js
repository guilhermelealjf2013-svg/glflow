const router = require('express').Router();
const { db } = require('../config/firebase');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (_req, res) => {
  const snap = await db.collection('taskTypes').orderBy('name').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, color } = req.body;
  const ref = await db.collection('taskTypes').add({ name, color });
  res.status(201).json({ id: ref.id, name, color });
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, color } = req.body;
  await db.collection('taskTypes').doc(req.params.id).update({ name, color });
  res.json({ id: req.params.id, name, color });
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  await db.collection('taskTypes').doc(req.params.id).delete();
  res.status(204).end();
});

module.exports = router;
