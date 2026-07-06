const router = require('express').Router();
const { db } = require('../config/firebase');
const { authenticate, authorize } = require('../middleware/auth');
const { detectConflict } = require('../utils/timeConflict');

async function getExistingBlocks(representativeId, date, excludeId = null) {
  const [tasksSnap, pausesSnap] = await Promise.all([
    db.collection('tasks').where('representativeId', '==', representativeId).where('date', '==', date).get(),
    db.collection('pauses').where('representativeId', '==', representativeId).where('isTemplate', '==', true).get(),
  ]);
  const blocks = [
    ...tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    ...pausesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  ];
  return excludeId ? blocks.filter(b => b.id !== excludeId) : blocks;
}

// Get tasks by date
router.get('/', authenticate, async (req, res) => {
  const { date, representativeId } = req.query;
  const { role, id: userId } = req.user;

  let query = db.collection('tasks');
  if (date) query = query.where('date', '==', date);

  if (role === 'REPRESENTATIVE') {
    query = query.where('representativeId', '==', userId);
  } else if (representativeId) {
    query = query.where('representativeId', '==', representativeId);
  }

  const snap = await query.get();
  let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Supervisors: filter to their assigned representatives
  if (role === 'SUPERVISOR' && !representativeId) {
    const membersSnap = await db.collection('users').where('supervisorId', '==', userId).get();
    const memberIds = new Set(membersSnap.docs.map(d => d.id));
    tasks = tasks.filter(t => memberIds.has(t.representativeId));
  }

  // Enrich with type info
  const typeIds = [...new Set(tasks.map(t => t.typeId).filter(Boolean))];
  const typeMap = {};
  if (typeIds.length) {
    await Promise.all(typeIds.map(async id => {
      const s = await db.collection('taskTypes').doc(id).get();
      if (s.exists) typeMap[id] = { id, ...s.data() };
    }));
  }

  res.json(tasks.map(t => ({ ...t, type: typeMap[t.typeId] || null })));
});

// Create task
router.post('/', authenticate, authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { title, typeId, representativeId, date, startTime, endTime, notes } = req.body;

  const blocks = await getExistingBlocks(representativeId, date);
  const { conflict, with: conflictWith } = detectConflict(blocks, startTime, endTime);
  if (conflict) return res.status(409).json({ error: 'Conflito de horário', conflictWith });

  const data = {
    title, typeId, representativeId, date, startTime, endTime,
    notes: notes || null, status: 'NOT_STARTED',
    createdById: req.user.id, createdAt: new Date().toISOString(),
  };
  const ref = await db.collection('tasks').add(data);
  const typeSnap = await db.collection('taskTypes').doc(typeId).get();

  res.status(201).json({ id: ref.id, ...data, type: typeSnap.exists ? { id: typeId, ...typeSnap.data() } : null });
});

// Update status
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const { role, id: userId } = req.user;

  const snap = await db.collection('tasks').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Tarefa não encontrada' });
  const task = { id: snap.id, ...snap.data() };

  if (role === 'REPRESENTATIVE' && task.representativeId !== userId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (role === 'REPRESENTATIVE' && task.status === 'COMPLETED') {
    return res.status(403).json({ error: 'Tarefa concluída não pode ser alterada pelo representante' });
  }
  if (task.status === 'COMPLETED' && status !== 'COMPLETED' && !['ADMIN', 'SUPERVISOR'].includes(role)) {
    return res.status(403).json({ error: 'Apenas supervisores podem reativar tarefas concluídas' });
  }

  await db.collection('tasks').doc(req.params.id).update({ status });
  const typeSnap = await db.collection('taskTypes').doc(task.typeId).get();
  res.json({ ...task, status, type: typeSnap.exists ? { id: task.typeId, ...typeSnap.data() } : null });
});

// Update task details
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { title, typeId, date, startTime, endTime, notes } = req.body;
  const snap = await db.collection('tasks').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Tarefa não encontrada' });
  const task = { id: snap.id, ...snap.data() };

  if (startTime || endTime) {
    const newStart = startTime || task.startTime;
    const newEnd = endTime || task.endTime;
    const blocks = await getExistingBlocks(task.representativeId, date || task.date, task.id);
    const { conflict, with: cw } = detectConflict(blocks, newStart, newEnd);
    if (conflict) return res.status(409).json({ error: 'Conflito de horário', conflictWith: cw });
  }

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (typeId !== undefined) updates.typeId = typeId;
  if (date !== undefined) updates.date = date;
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (notes !== undefined) updates.notes = notes;

  await db.collection('tasks').doc(req.params.id).update(updates);
  res.json({ ...task, ...updates });
});

// Delete task
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  await db.collection('tasks').doc(req.params.id).delete();
  res.status(204).end();
});

module.exports = router;
