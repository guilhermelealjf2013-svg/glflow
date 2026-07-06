require('dotenv').config();
const { admin, db, auth } = require('../src/config/firebase');

async function createUser(username, password, profile) {
  let uid;
  try {
    const existing = await auth.getUserByEmail(`${username}@glflow.com`);
    uid = existing.uid;
    console.log(`  ↳ auth já existe: ${username}`);
  } catch {
    const created = await auth.createUser({
      email: `${username}@glflow.com`,
      password,
      displayName: profile.name,
    });
    uid = created.uid;
    console.log(`  ↳ auth criado: ${username} (${uid})`);
  }
  await db.collection('users').doc(uid).set(profile, { merge: true });
  return uid;
}

async function main() {
  console.log('🌱 Iniciando seed GLFlow...\n');

  // ── Usuários ──
  console.log('Criando usuários...');
  const adminId = await createUser('admin', 'admin123', {
    name: 'Administrador',
    registration: '00001',
    username: 'admin',
    role: 'ADMIN',
    workload: null,
    loginTime: null,
    logoutTime: null,
    teamId: null,
    createdAt: new Date().toISOString(),
  });

  const supervisorId = await createUser('supervisor01', 'supervisor123', {
    name: 'Carlos Supervisor',
    registration: '00002',
    username: 'supervisor01',
    role: 'SUPERVISOR',
    workload: null,
    loginTime: null,
    logoutTime: null,
    teamId: null,
    createdAt: new Date().toISOString(),
  });

  // ── Equipe ──
  console.log('\nCriando equipe...');
  const teamRef = db.collection('teams').doc('team-alpha');
  await teamRef.set({ name: 'Equipe Alpha', supervisorId }, { merge: true });
  await db.collection('users').doc(supervisorId).update({ teamId: 'team-alpha' });
  console.log('  ↳ Equipe Alpha criada');

  // ── Representantes ──
  console.log('\nCriando representantes...');
  const rep1Id = await createUser('rep01', 'rep123', {
    name: 'Ana Lima',
    registration: '10001',
    username: 'rep01',
    role: 'REPRESENTATIVE',
    workload: 'EIGHT_TWELVE',
    loginTime: '08:00',
    logoutTime: '17:12',
    teamId: 'team-alpha',
    createdAt: new Date().toISOString(),
  });

  const rep2Id = await createUser('rep02', 'rep123', {
    name: 'Bruno Costa',
    registration: '10002',
    username: 'rep02',
    role: 'REPRESENTATIVE',
    workload: 'SIX_TWENTY',
    loginTime: '07:00',
    logoutTime: '13:20',
    teamId: 'team-alpha',
    createdAt: new Date().toISOString(),
  });

  // ── Pausas NR-17 ──
  console.log('\nCriando pausas NR-17...');
  const pausesBatch = db.batch();
  const pausesRep1 = [
    { label: 'Pausa 1', startTime: '10:00', endTime: '10:15' },
    { label: 'Almoço',  startTime: '12:00', endTime: '13:00' },
    { label: 'Pausa 2', startTime: '15:00', endTime: '15:15' },
  ];
  pausesRep1.forEach(p => {
    pausesBatch.set(db.collection('pauses').doc(), {
      representativeId: rep1Id, ...p,
      isTemplate: true, date: '2099-01-01',
    });
  });
  // rep2 (06:20)
  [
    { label: 'Pausa 1', startTime: '09:00', endTime: '09:10' },
    { label: 'Almoço',  startTime: '10:20', endTime: '10:50' },
    { label: 'Pausa 2', startTime: '12:00', endTime: '12:10' },
  ].forEach(p => {
    pausesBatch.set(db.collection('pauses').doc(), {
      representativeId: rep2Id, ...p,
      isTemplate: true, date: '2099-01-01',
    });
  });
  await pausesBatch.commit();
  console.log('  ↳ Pausas criadas');

  // ── Tipos de Tarefa ──
  console.log('\nCriando tipos de tarefa...');
  const types = [
    { id: 'tt-atendimento', name: 'Atendimento', color: '#3b82f6' },
    { id: 'tt-treinamento', name: 'Treinamento', color: '#8b5cf6' },
    { id: 'tt-reuniao',     name: 'Reunião',     color: '#f59e0b' },
    { id: 'tt-backoffice',  name: 'Backoffice',  color: '#10b981' },
  ];
  const typeBatch = db.batch();
  types.forEach(t => {
    const { id, ...data } = t;
    typeBatch.set(db.collection('taskTypes').doc(id), data, { merge: true });
  });
  await typeBatch.commit();
  console.log('  ↳ 4 tipos criados');

  console.log('\n✅ Seed concluído!\n');
  console.log('Credenciais de acesso:');
  console.log('  admin        / admin123');
  console.log('  supervisor01 / supervisor123');
  console.log('  rep01        / rep123');
  console.log('  rep02        / rep123');
}

main().catch(console.error).finally(() => process.exit(0));
