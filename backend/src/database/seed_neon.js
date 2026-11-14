import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos iniciales en Neon PostgreSQL...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Usuarios del restaurante
  const users = [
    {
      id: '1',
      name: 'Administrador General',
      email: 'admin@sesamo.com',
      password: passwordHash,
      role: 'ADMINISTRADOR',
      pin: '1111',
      phone: '+57 300 000 0001',
      documentId: '1000000001',
      assignedArea: 'Dirección General',
      hourlyRate: 20000,
    },
    {
      id: '2',
      name: 'Andrea Silva (Gerente)',
      email: 'andrea@sesamo.com',
      password: passwordHash,
      role: 'GERENTE',
      pin: '7890',
      phone: '+57 320 111 2233',
      documentId: '1056473829',
      assignedArea: 'Supervisión de Turno',
      hourlyRate: 15000,
    },
    {
      id: '3',
      name: 'Laura Gómez (Cajera)',
      email: 'laura@sesamo.com',
      password: passwordHash,
      role: 'CAJERO',
      pin: '4567',
      phone: '+57 315 222 3344',
      documentId: '1082736451',
      assignedArea: 'Caja Principal #1',
      hourlyRate: 9000,
    },
    {
      id: '4',
      name: 'Carlos Mendoza (Mesero)',
      email: 'carlos@sesamo.com',
      password: passwordHash,
      role: 'MESERO',
      pin: '1234',
      phone: '+57 311 333 4455',
      documentId: '1093847562',
      assignedArea: 'Salón Comedor',
      hourlyRate: 8500,
    },
    {
      id: '5',
      name: 'Sofía Castro (Mesera)',
      email: 'sofia@sesamo.com',
      password: passwordHash,
      role: 'MESERO',
      pin: '2345',
      phone: '+57 318 444 5566',
      documentId: '1074839201',
      assignedArea: 'Salón Comedor',
      hourlyRate: 8500,
    },
    {
      id: '6',
      name: 'Chef Principal (Cocina)',
      email: 'cocina@sesamo.com',
      password: passwordHash,
      role: 'COCINA',
      pin: '0000',
      phone: '+57 302 555 6677',
      documentId: '1065748392',
      assignedArea: 'Línea Caliente y Parrilla',
      hourlyRate: 14000,
    },
    {
      id: '7',
      name: 'Kevin Domicilios',
      email: 'kevin@sesamo.com',
      password: passwordHash,
      role: 'REPARTIDOR',
      pin: '9999',
      phone: '+57 317 777 8899',
      documentId: '1048392019',
      assignedArea: 'Flota Externa',
      hourlyRate: 8000,
    },
    {
      id: '8',
      name: 'Mateo Bodega (Inventario)',
      email: 'mateo@sesamo.com',
      password: passwordHash,
      role: 'INVENTARIO',
      pin: '8888',
      phone: '+57 316 888 9900',
      documentId: '1039281726',
      assignedArea: 'Almacén y Compras',
      hourlyRate: 9500,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u,
    });
  }
  console.log(`✅ ${users.length} usuarios sembrados correctamente.`);

  // 2. Mesas del restaurante
  const tables = [
    { number: 1, capacity: 4, location: 'Salón Principal', status: 'DISPONIBLE' },
    { number: 2, capacity: 4, location: 'Salón Principal', status: 'DISPONIBLE' },
    { number: 3, capacity: 2, location: 'Salón Principal', status: 'DISPONIBLE' },
    { number: 4, capacity: 6, location: 'Salón Principal', status: 'DISPONIBLE' },
    { number: 5, capacity: 4, location: 'Salón Principal', status: 'DISPONIBLE' },
    { number: 6, capacity: 4, location: 'Salón Comedor', status: 'DISPONIBLE' },
    { number: 7, capacity: 4, location: 'Salón Comedor', status: 'DISPONIBLE' },
    { number: 8, capacity: 8, location: 'Salón Comedor', status: 'DISPONIBLE' },
    { number: 9, capacity: 2, location: 'Barra', status: 'DISPONIBLE' },
    { number: 10, capacity: 2, location: 'Barra', status: 'DISPONIBLE' },
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { number: t.number },
      update: t,
      create: t,
    });
  }
  console.log(`✅ ${tables.length} mesas sembradas correctamente.`);

  // 3. Categorías de productos
  const categories = [
    { id: 'cat-1', name: 'Entradas & Tapas', description: 'Para compartir al centro' },
    { id: 'cat-2', name: 'Platos Fuertes', description: 'Especialidades de la casa' },
    { id: 'cat-3', name: 'Bebidas & Coctelería', description: 'Jugos, gaseosas, cócteles y café' },
    { id: 'cat-4', name: 'Postres Artesanales', description: 'El dulce final de la experiencia' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log(`✅ ${categories.length} categorías sembradas correctamente.`);

  console.log('✨ Base de datos en Neon PostgreSQL sembrada y lista para producción.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
