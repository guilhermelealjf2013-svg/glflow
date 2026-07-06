/**
 * Simulação completa — popula tarefas de HOJE para rep01
 * com status variados para demonstrar todas as funcionalidades visuais:
 *   ✓ Tarefas COMPLETED (opacas)
 *   ▶ Tarefa IN_PROGRESS (ampliada, brilhante, pulsante)
 *   ○ Tarefas NOT_STARTED (normais)
 *   ─ Pausas NR-17 já registradas no cadastro do rep
 */
require('dotenv').config();
const { admin, db, auth } = require('../src/config/firebase');

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n📅 Criando jornada de simulação para: ${today}\n`);

  // Buscar rep01
  const fbUser = await auth.getUserByEmail('rep01@glflow.com');
  const uid = fbUser.uid;
  console.log(`rep01 uid: ${uid}`);

  // Limpar tarefas de hoje para rep01 (evitar duplicatas)
  const existing = await db.collection('tasks')
    .where('representativeId', '==', uid)
    .where('date', '==', today)
    .get();
  if (!existing.empty) {
    const del = db.batch();
    existing.docs.forEach(d => del.delete(d.ref));
    await del.commit();
    console.log(`🗑  ${existing.size} tarefa(s) de hoje removida(s)\n`);
  }

  // Buscar tipos de tarefa
  const typesSnap = await db.collection('taskTypes').get();
  const types = {};
  typesSnap.docs.forEach(d => { types[d.data().name] = d.id; });
  console.log('Tipos disponíveis:', Object.keys(types));

  // Resolver typeId com fallback para o primeiro tipo disponível
  const firstType = Object.values(types)[0] || 'generic';
  const t = name => types[name] || firstType;

  // ──────────────────────────────────────────────────────────────
  // Jornada 08:00–17:12 | CH 8h12
  // Pausas NR-17: Pausa1 10:00-10:15 | Almoço 12:00-13:00 | Pausa2 15:00-15:15
  // Horário atual em torno de 21h → colocamos IN_PROGRESS em bloco que "já deveria ter iniciado"
  // Para fins de simulação visual, forçamos IN_PROGRESS no bloco de 10:15–11:30
  // ──────────────────────────────────────────────────────────────
  const tasks = [
    {
      title: 'Atendimento Receptivo',
      typeId: t('Atendimento'),
      startTime: '08:00', endTime: '10:00',
      status: 'COMPLETED',
      notes: 'Finalizado dentro do prazo.',
    },
    // 10:00–10:15 → Pausa NR-17 (bloco automático do cadastro)
    {
      title: 'Treinamento — Produto X',
      typeId: t('Treinamento'),
      startTime: '10:15', endTime: '11:30',
      status: 'COMPLETED',
      notes: null,
    },
    {
      title: 'Reunião de Alinhamento',
      typeId: t('Reunião'),
      startTime: '11:30', endTime: '12:00',
      status: 'IN_PROGRESS',   // ← TAREFA ATIVA — será exibida ampliada e pulsante
      notes: 'Pauta: metas do mês.',
    },
    // 12:00–13:00 → Almoço (bloco automático do cadastro)
    {
      title: 'Backoffice — Ordens do dia',
      typeId: t('Backoffice'),
      startTime: '13:00', endTime: '14:30',
      status: 'NOT_STARTED',
      notes: null,
    },
    {
      title: 'Atendimento Receptivo',
      typeId: t('Atendimento'),
      startTime: '14:30', endTime: '15:00',
      status: 'NOT_STARTED',
      notes: null,
    },
    // 15:00–15:15 → Pausa NR-17
    {
      title: 'Atendimento Receptivo',
      typeId: t('Atendimento'),
      startTime: '15:15', endTime: '17:12',
      status: 'NOT_STARTED',
      notes: null,
    },
  ];

  const batch = db.batch();
  tasks.forEach(task => {
    const ref = db.collection('tasks').doc();
    batch.set(ref, {
      ...task,
      representativeId: uid,
      date: today,
      createdById: 'seed_simulacao',
      createdAt: new Date().toISOString(),
    });
  });
  await batch.commit();

  console.log(`\n✅ ${tasks.length} tarefas criadas para Ana Lima em ${today}:\n`);
  tasks.forEach(task => {
    const icon = task.status === 'COMPLETED' ? '✓' : task.status === 'IN_PROGRESS' ? '▶' : '○';
    console.log(`  ${icon} ${task.startTime}–${task.endTime}  ${task.title}  [${task.status}]`);
  });

  console.log(`
─────────────────────────────────────────────────────────
  Acesse: http://localhost:5173
  Login:  rep01 / 123456
─────────────────────────────────────────────────────────
`);
}

main().catch(console.error).finally(() => process.exit(0));
