const { auth: fbAuth, db } = require('../config/firebase');

const presenceMap = new Map();

function getPresenceSnapshot() {
  const result = {};
  for (const [userId, data] of presenceMap.entries()) {
    result[userId] = { status: data.status, lastSeen: data.lastSeen };
  }
  return result;
}

function setupPresence(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = await fbAuth.verifyIdToken(token);
      const snap = await db.collection('users').doc(decoded.uid).get();
      if (!snap.exists) return next(new Error('User not found'));
      socket.user = { id: decoded.uid, ...snap.data() };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, name, teamId, role } = socket.user;

    presenceMap.set(userId, { socketId: socket.id, status: 'ONLINE', lastSeen: new Date() });

    // Log async (fire-and-forget)
    db.collection('presenceLogs').add({ userId, status: 'ONLINE', timestamp: new Date().toISOString() }).catch(() => {});

    const room = teamId || `role-${role}`;
    socket.join(room);
    if (role === 'ADMIN' || role === 'MANAGER') socket.join('all-teams');

    io.to(room).emit('presence:update', { userId, status: 'ONLINE', name });
    socket.emit('presence:snapshot', getPresenceSnapshot());

    socket.on('presence:status', (status) => {
      if (!['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) return;
      const prev = presenceMap.get(userId);
      if (prev?.status === status) return;

      presenceMap.set(userId, { socketId: socket.id, status, lastSeen: new Date() });
      db.collection('presenceLogs').add({ userId, status, timestamp: new Date().toISOString() }).catch(() => {});

      io.to(room).emit('presence:update', { userId, status, name });
      io.to('all-teams').emit('presence:update', { userId, status, name });
    });

    socket.on('task:status-changed', (payload) => {
      io.to(room).emit('task:status-changed', payload);
      io.to('all-teams').emit('task:status-changed', payload);
      // Supervisors need to receive events from reps (different rooms)
      io.to('role-SUPERVISOR').emit('task:status-changed', payload);
    });

    socket.on('disconnect', () => {
      presenceMap.set(userId, { socketId: null, status: 'OFFLINE', lastSeen: new Date() });
      db.collection('presenceLogs').add({ userId, status: 'OFFLINE', timestamp: new Date().toISOString() }).catch(() => {});
      io.to(room).emit('presence:update', { userId, status: 'OFFLINE', name });
      io.to('all-teams').emit('presence:update', { userId, status: 'OFFLINE', name });
    });
  });
}

module.exports = { setupPresence };
