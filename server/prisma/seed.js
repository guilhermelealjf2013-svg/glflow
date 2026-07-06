const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const supervisorHash = await bcrypt.hash('supervisor123', 10);
  const repHash = await bcrypt.hash('rep123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      registration: '00001',
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { username: 'supervisor01' },
    update: {},
    create: {
      name: 'Carlos Supervisor',
      registration: '00002',
      username: 'supervisor01',
      passwordHash: supervisorHash,
      role: 'SUPERVISOR',
    },
  });

  const team = await prisma.team.upsert({
    where: { id: 'team-alpha' },
    update: {},
    create: {
      id: 'team-alpha',
      name: 'Equipe Alpha',
      supervisorId: supervisor.id,
    },
  });

  await prisma.user.update({
    where: { id: supervisor.id },
    data: { teamId: team.id },
  });

  const rep1 = await prisma.user.upsert({
    where: { username: 'rep01' },
    update: {},
    create: {
      name: 'Ana Lima',
      registration: '10001',
      username: 'rep01',
      passwordHash: repHash,
      role: 'REPRESENTATIVE',
      workload: 'EIGHT_TWELVE',
      loginTime: '08:00',
      logoutTime: '17:12',
      teamId: team.id,
    },
  });

  const rep2 = await prisma.user.upsert({
    where: { username: 'rep02' },
    update: {},
    create: {
      name: 'Bruno Costa',
      registration: '10002',
      username: 'rep02',
      passwordHash: repHash,
      role: 'REPRESENTATIVE',
      workload: 'SIX_TWENTY',
      loginTime: '07:00',
      logoutTime: '13:20',
      teamId: team.id,
    },
  });

  const taskTypes = await Promise.all([
    prisma.taskType.upsert({
      where: { id: 'tt-atendimento' },
      update: {},
      create: { id: 'tt-atendimento', name: 'Atendimento', color: '#3b82f6' },
    }),
    prisma.taskType.upsert({
      where: { id: 'tt-treinamento' },
      update: {},
      create: { id: 'tt-treinamento', name: 'Treinamento', color: '#8b5cf6' },
    }),
    prisma.taskType.upsert({
      where: { id: 'tt-reuniao' },
      update: {},
      create: { id: 'tt-reuniao', name: 'Reunião', color: '#f59e0b' },
    }),
    prisma.taskType.upsert({
      where: { id: 'tt-backoffice' },
      update: {},
      create: { id: 'tt-backoffice', name: 'Backoffice', color: '#10b981' },
    }),
  ]);

  // Seed pauses for rep1
  await prisma.pause.createMany({
    data: [
      { representativeId: rep1.id, label: 'Pausa 1', startTime: '10:00', endTime: '10:15', isTemplate: true, date: '2099-01-01' },
      { representativeId: rep1.id, label: 'Almoço',  startTime: '12:00', endTime: '13:00', isTemplate: true, date: '2099-01-01' },
      { representativeId: rep1.id, label: 'Pausa 2', startTime: '15:00', endTime: '15:15', isTemplate: true, date: '2099-01-01' },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed ✓');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
