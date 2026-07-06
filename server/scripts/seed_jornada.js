require('dotenv').config();
const { admin, db, auth } = require('../src/config/firebase');

async function main() {
  // Buscar rep01
  const fbUser = await auth.getUserByEmail('rep01@glflow.com');
  const uid = fbUser.uid;
  console.log(`rep01 uid: ${uid}`);

  const date = '2026-07-04';

  // Buscar tipos de tarefa
  const typesSnap = await db.collection('taskTypes').get();
  const types = {};
  typesSnap.docs.forEach(d => { types[d.data().name] = d.id; });
  console.log('Tipos disponíveis:', Object.keys(types));

  // Jornada fictícia da Ana Lima (08:00–17:12 | CH 8h12)
  // Pausas NR-17 já existem: Pausa1 10:00-10:15 | Almoço 12:00-13:00 | Pausa2 15:00-15:15
  const tasks = [
    { title: 'Atendimento Receptivo',  typeId: types['Atendimento'], startTime: '08:00', endTime: '10:00', status: 'COMPLETED'    },
    // 10:00–10:15 → Pausa NR-17
    { title: 'Treinamento Produto X',  typeId: types['Treinamento'], startTime: '10:15', endTime: '11:30', status: 'COMPLETED'    },
    { title: 'Reunião de Equipe',      typeId: types['Reunião'],     startTime: '11:30', endTime: '12:00', status: 'IN_PROGRESS'  },
    // 12:00–13:00 → Almoço
    { title: 'Backoffice – OS do dia', typeId: types['Backoffice'],  startTime: '13:00', endTime: '14:30', status: 'NOT_STARTED'  },
    { title: 'Atendimento Receptivo',  typeId: types['Atendimento'], startTime: '14:30', endTime: '15:00', status: 'NOT_STARTED'  },
    // 15:00–15:15 → Pausa NR-17
    { title: 'Atendimento Receptivo',  typeId: types['Atendimento'], startTime: '15:15', endTime: '17:12', status: 'NOT_STARTED'  },
  ];

  const batch = db.batch();
  tasks.forEach(t => {
    const ref = db.collection('tasks').doc();
    batch.set(ref, {
      ...t,
      representativeId: uid,
      date,
      notes: null,
      createdById: 'seed',
      createdAt: new Date().toISOString(),
    });
  });
  await batch.commit();

  console.log(`\n✅ ${tasks.length} tarefas criadas para Ana Lima em ${date}`);
  tasks.forEach(t => console.log(`  ${t.startTime}–${t.endTime} | ${t.title} [${t.status}]`));
}

main().catch(console.error).finally(() => process.exit(0));
