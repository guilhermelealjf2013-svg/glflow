/**
 * Demo de notificações — cria tarefas iniciando AGORA e nos próximos minutos
 * para disparar os popups de aviso e início imediatamente.
 */
require('dotenv').config();
const { db, auth } = require('../src/config/firebase');

async function main() {
  const fbUser = await auth.getUserByEmail('rep01@glflow.com');
  const uid = fbUser.uid;

  const today = new Date().toISOString().slice(0, 10);

  // Calcular horários relativos ao momento atual
  const now = new Date();
  const addMin = (delta) => {
    const t = now.getHours() * 60 + now.getMinutes() + delta;
    return `${String(Math.floor(t / 60) % 24).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;
  };

  // t0 = agora     → diff=0 → POPUP DE INÍCIO (tom triplo ascendente)
  // t2 = agora+2   → diff=2 → POPUP DE AVISO "2 minutos" (ping suave)
  // t4 = agora+4   → diff=4 → POPUP DE AVISO "4 minutos"
  // end  = agora+15 para deixar margem
  const t0  = addMin(0);
  const t2  = addMin(2);
  const t4  = addMin(4);
  const end0 = addMin(15);

  // Buscar tipo de tarefa
  const typesSnap = await db.collection('taskTypes').get();
  const firstType = typesSnap.docs[0];
  const typeId = firstType?.id || 'generic';
  const typeName = firstType?.data().name || 'Tarefa';

  // Limpar quaisquer tarefas de demo anteriores para hoje
  const existing = await db.collection('tasks')
    .where('representativeId', '==', uid)
    .where('date', '==', today)
    .where('createdById', '==', 'notif_demo')
    .get();
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
  }

  const tasks = [
    { title: `${typeName} — INÍCIO AGORA`,       startTime: t0, endTime: end0, status: 'NOT_STARTED' },
    { title: `${typeName} — Aviso 2 min`,         startTime: t2, endTime: end0, status: 'NOT_STARTED' },
    { title: `${typeName} — Aviso 4 min`,         startTime: t4, endTime: end0, status: 'NOT_STARTED' },
  ];

  const batch = db.batch();
  tasks.forEach(task => {
    batch.set(db.collection('tasks').doc(), {
      ...task, typeId,
      representativeId: uid,
      date: today,
      notes: null,
      createdById: 'notif_demo',
      createdAt: new Date().toISOString(),
    });
  });
  await batch.commit();

  console.log(`\n✅ Tarefas de demo criadas para ${today}:\n`);
  tasks.forEach(t => console.log(`  ${t.startTime}  →  ${t.title}`));
  console.log(`
  Próximos passos:
  1. Abra http://localhost:5173 como rep01 / 123456
  2. Aguarde até 30 segundos — os popups aparecerão automaticamente
     🔔 PING suave    = aviso (2 e 4 min antes)
     🎵 Três tons     = início (agora: ${t0})
`);
}

main().catch(console.error).finally(() => process.exit(0));
