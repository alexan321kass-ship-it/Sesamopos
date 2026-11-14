import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos Neon PostgreSQL con catálogo completo de Sésamo...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Usuarios / Personal
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
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '09:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: true,
        canApplyDiscounts: true,
        canVoidItems: true,
        canAccessReports: true,
        canManageInventory: true,
        canManageStaff: true,
      },
      stats: { ordersServed: 0, salesVolume: 0, tipsAccumulated: 0, rating: 5.0 }
    },
    {
      id: '2',
      name: 'Carlos Ruiz (Mesero)',
      email: 'carlos@sesamo.com',
      password: passwordHash,
      role: 'MESERO',
      pin: '1234',
      phone: '+57 311 333 4455',
      documentId: '1093847562',
      assignedArea: 'Salón',
      hourlyRate: 8500,
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '11:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: false,
        canManageInventory: false,
        canManageStaff: false,
      },
      stats: { ordersServed: 18, salesVolume: 1250000, tipsAccumulated: 125000, rating: 4.9 }
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
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '10:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: true,
        canApplyDiscounts: true,
        canVoidItems: true,
        canAccessReports: false,
        canManageInventory: false,
        canManageStaff: false,
      },
      stats: { ordersServed: 42, salesVolume: 3450000, tipsAccumulated: 0, rating: 4.8 }
    },
    {
      id: '5',
      name: 'Andrea Silva (Gerente)',
      email: 'andrea@sesamo.com',
      password: passwordHash,
      role: 'GERENTE',
      pin: '7890',
      phone: '+57 320 111 2233',
      documentId: '1056473829',
      assignedArea: 'Supervisión de Turno',
      hourlyRate: 15000,
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '10:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: true,
        canApplyDiscounts: true,
        canVoidItems: true,
        canAccessReports: true,
        canManageInventory: true,
        canManageStaff: true,
      },
      stats: { ordersServed: 0, salesVolume: 0, tipsAccumulated: 0, rating: 5.0 }
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
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '10:30',
      isActive: true,
      permissions: {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: false,
        canManageInventory: true,
        canManageStaff: false,
      },
      stats: { ordersServed: 35, salesVolume: 0, tipsAccumulated: 0, rating: 5.0 }
    },
    {
      id: '7',
      name: 'Andrés Ramírez (Mesero)',
      email: 'andres@sesamo.com',
      password: passwordHash,
      role: 'MESERO',
      pin: '5678',
      phone: '+57 312 888 7766',
      documentId: '1029384756',
      assignedArea: 'Salón',
      hourlyRate: 8500,
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '12:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: false,
        canManageInventory: false,
        canManageStaff: false,
      },
      stats: { ordersServed: 12, salesVolume: 890000, tipsAccumulated: 89000, rating: 4.7 }
    },
    {
      id: '8',
      name: 'Sofía López (Mesera)',
      email: 'sofia@sesamo.com',
      password: passwordHash,
      role: 'MESERO',
      pin: '2345',
      phone: '+57 318 444 5566',
      documentId: '1074839201',
      assignedArea: 'Salón',
      hourlyRate: 8500,
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '12:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: false,
        canManageInventory: false,
        canManageStaff: false,
      },
      stats: { ordersServed: 15, salesVolume: 970000, tipsAccumulated: 97000, rating: 4.9 }
    },
    {
      id: '9',
      name: 'Kevin Domicilios',
      email: 'kevin@sesamo.com',
      password: passwordHash,
      role: 'REPARTIDOR',
      pin: '9999',
      phone: '+57 317 777 8899',
      documentId: '1048392019',
      assignedArea: 'Flota Externa',
      hourlyRate: 8000,
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '11:30',
      isActive: true,
      permissions: {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: false,
        canManageInventory: false,
        canManageStaff: false,
      },
      stats: { ordersServed: 24, salesVolume: 1680000, tipsAccumulated: 45000, rating: 4.9 }
    },
    {
      id: '10',
      name: 'Mateo Bodega (Inventario)',
      email: 'mateo@sesamo.com',
      password: passwordHash,
      role: 'INVENTARIO',
      pin: '8888',
      phone: '+57 316 888 9900',
      documentId: '1039281726',
      assignedArea: 'Almacén y Compras',
      hourlyRate: 9500,
      shiftStatus: 'EN_TURNO',
      shiftStartTime: '08:00',
      isActive: true,
      permissions: {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: true,
        canManageInventory: true,
        canManageStaff: false,
      },
      stats: { ordersServed: 0, salesVolume: 0, tipsAccumulated: 0, rating: 5.0 }
    }
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      const { id, password, ...rest } = u;
      await prisma.user.update({
        where: { email: u.email },
        data: rest,
      });
    } else {
      const { id, ...dataWithoutId } = u;
      await prisma.user.create({
        data: dataWithoutId,
      });
    }
  }
  console.log(`✅ ${users.length} usuarios sincronizados en Neon.`);

  // 2. Categorías
  const categories = [
    { id: '1', name: 'Hamburguesas', description: 'Hamburguesas artesanales 100% carne de res', isActive: true },
    { id: '2', name: 'Pizzas', description: 'Pizzas horneadas en horno de piedra de leña', isActive: true },
    { id: '3', name: 'Acompañamientos', description: 'Papas, aros de cebolla y entradas deliciosas', isActive: true },
    { id: '4', name: 'Bebidas', description: 'Gaseosas, jugos naturales y cervezas frías', isActive: true },
    { id: '5', name: 'Postres', description: 'Postres artesanales de la casa', isActive: true },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log(`✅ ${categories.length} categorías sincronizadas en Neon.`);

  // 3. Productos (Catálogo completo de Sésamo)
  const products = [
    {
      id: '1',
      sku: 'HAM-01',
      name: 'Hamburguesa Clásica',
      description: 'Carne 150g artesanal, queso cheddar fundido, lechuga fresca, tomate jugoso y salsa especial de la casa',
      categoryId: '1',
      price: 22000,
      cost: 8500,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      tags: ['⭐ Más Vendido', '🔥 Recomendado'],
      rating: 4.9,
      calories: '650 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '2',
      sku: 'HAM-02',
      name: 'Hamburguesa BBQ Smoked',
      description: 'Carne 180g ahumada a la parrilla, queso ahumado, tocineta crujiente, aros de cebolla y salsa BBQ artesanal',
      categoryId: '1',
      price: 27000,
      cost: 10500,
      imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
      tags: ['🔥 BBQ Especial', '🥓 Tocineta Premium'],
      rating: 4.8,
      calories: '820 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '3',
      sku: 'HAM-03',
      name: 'Hamburguesa Doble Trufa',
      description: 'Doble carne 150g de res Angus, doble queso gouda, cebolla caramelizada lentamente y mayonesa de trufa negra',
      categoryId: '1',
      price: 34000,
      cost: 13500,
      imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
      tags: ['👑 Gourmet', '🖤 Trufa Negra'],
      rating: 5.0,
      calories: '980 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '4',
      sku: 'HAM-04',
      name: 'Hamburguesa Veggie Portobello',
      description: 'Hongo Portobello gigante a la parrilla, queso de cabra fundido, rúgula fresca y tomates deshidratados',
      categoryId: '1',
      price: 26000,
      cost: 9500,
      imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80',
      tags: ['🌱 Vegetariana', '🍄 Portobello'],
      rating: 4.7,
      calories: '510 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '5',
      sku: 'PIZ-01',
      name: 'Pizza Pepperoni Suprema',
      description: 'Salsa napolitana de la casa, abundante queso mozzarella hilado y generosas rodajas de pepperoni tostado',
      categoryId: '2',
      price: 38000,
      cost: 14000,
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      tags: ['🍕 Favorita', '🔥 Horno de Leña'],
      rating: 4.9,
      calories: '1100 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '6',
      sku: 'PIZ-02',
      name: 'Pizza Margarita Italiana',
      description: 'Salsa de tomates Italianos frescos, mozzarella fior di latte, hojas de albahaca fresca y aceite de oliva virgen extra',
      categoryId: '2',
      price: 32000,
      cost: 11000,
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
      tags: ['🇮🇹 Tradicional', '🌿 Albahaca Fresca'],
      rating: 4.8,
      calories: '890 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '7',
      sku: 'PIZ-03',
      name: 'Pizza Cuatro Quesos',
      description: 'Mezcla perfecta de Mozzarella, Gorgonzola cremoso, Parmesano reggiano madurado y Gouda ahumado',
      categoryId: '2',
      price: 42000,
      cost: 16000,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      tags: ['🧀 4 Quesos', '🤤 Cremosa'],
      rating: 4.9,
      calories: '1250 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '8',
      sku: 'ACO-01',
      name: 'Papas Rústicas a la Francesa',
      description: 'Papas de corte grueso sazonadas con romero fresco, ajo crujiente y sal marina en escamas',
      categoryId: '3',
      price: 10000,
      cost: 3000,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80',
      tags: ['🍟 Crocantes', '🌿 Romero & Ajo'],
      rating: 4.7,
      calories: '380 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '9',
      sku: 'ACO-02',
      name: 'Aros de Cebolla Crocantes',
      description: 'Cebolla dulce en aros empanizados dorados en su punto, acompañados de salsa alioli de ajo asado',
      categoryId: '3',
      price: 12000,
      cost: 3800,
      imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=80',
      tags: ['🧅 Alioli Casero'],
      rating: 4.6,
      calories: '420 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '10',
      sku: 'BEB-01',
      name: 'Coca-Cola Zero 400ml',
      description: 'Refrescante gaseosa helada en botella de vidrio servida con vaso con hielo y rodaja de limón',
      categoryId: '4',
      price: 6000,
      cost: 2200,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
      tags: ['🥤 Helada'],
      rating: 4.5,
      calories: '0 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '11',
      sku: 'BEB-02',
      name: 'Jugo Natural Mango & Maracuyá',
      description: 'Jugo 100% frutal preparado al instante en agua o leche de almendras 500ml',
      categoryId: '4',
      price: 8500,
      cost: 2800,
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
      tags: ['🥭 100% Natural', '🍊 Fruta Fresca'],
      rating: 4.9,
      calories: '140 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '12',
      sku: 'BEB-03',
      name: 'Cerveza Artesanal IPA 330ml',
      description: 'Cerveza de la casa estilo India Pale Ale con intensas notas de lúpulo cítrico y herbal',
      categoryId: '4',
      price: 14000,
      cost: 5500,
      imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80',
      tags: ['🍺 Artesanal', '⚡ Lúpulo Cítrico'],
      rating: 4.9,
      calories: '210 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '13',
      sku: 'POS-01',
      name: 'Brownie Fudge de Chocolate con Helado',
      description: 'Brownie tibio recién horneado de chocolate semiamargo 70%, servido con una bola de helado artesanal de vainilla',
      categoryId: '5',
      price: 15000,
      cost: 4500,
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
      tags: ['🍫 Chocolate 70%', '🍦 Helado Artesanal'],
      rating: 5.0,
      calories: '540 kcal',
      isAvailable: true,
      isActive: true,
    },
    {
      id: '14',
      sku: 'POS-02',
      name: 'Cheesecake de Frutos Rojos',
      description: 'Tarta de queso crema suave estilo New York con cubierta casera de moras silvestres y arándanos',
      categoryId: '5',
      price: 16000,
      cost: 5000,
      imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80',
      tags: ['🍓 Frutos Rojos', '🍰 Suave & Cremoso'],
      rating: 4.9,
      calories: '480 kcal',
      isAvailable: true,
      isActive: true,
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  console.log(`✅ ${products.length} productos sembrados en Neon.`);

  // 4. Mesas
  const tables = [
    { id: '1', number: 1, capacity: 2, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz' },
    { id: '2', number: 2, capacity: 4, location: 'Salón', status: 'OCUPADA', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz', currentOrderId: '1024', timeOccupied: Date.now() - 2400000 },
    { id: '3', number: 3, capacity: 4, location: 'Salón', status: 'PEDIDO_LISTO', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz', currentOrderId: '1025', timeOccupied: Date.now() - 1800000 },
    { id: '4', number: 4, capacity: 6, location: 'Salón', status: 'RESERVADA', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz' },
    { id: '5', number: 5, capacity: 2, location: 'Salón', status: 'OCUPADA', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez', currentOrderId: '1026', timeOccupied: Date.now() - 900000 },
    { id: '6', number: 6, capacity: 8, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez' },
    { id: '7', number: 7, capacity: 4, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez' },
    { id: '8', number: 8, capacity: 4, location: 'Salón', status: 'OCUPADA', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez', currentOrderId: '1028', timeOccupied: Date.now() - 1200000 },
    { id: '9', number: 9, capacity: 2, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
    { id: '10', number: 10, capacity: 6, location: 'Salón', status: 'RESERVADA', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
    { id: '11', number: 11, capacity: 8, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
    { id: '12', number: 12, capacity: 10, location: 'Salón', status: 'OCUPADA', currentWaiterId: '8', currentWaiterName: 'Sofía López', currentOrderId: '1029', timeOccupied: Date.now() - 3000000 },
    { id: '13', number: 13, capacity: 4, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
  ];

  for (const t of tables) {
    const { id, ...tableWithoutId } = t;
    await prisma.table.upsert({
      where: { number: t.number },
      update: tableWithoutId,
      create: t,
    });
  }
  console.log(`✅ ${tables.length} mesas sincronizadas en Neon.`);

  // 5. Insumos de Inventario
  const inventoryItems = [
    { id: '1', code: 'INS-01', sku: 'INS-01', name: 'Carne de Res Molida (Angus)', category: 'Carnes', unit: 'Kg', currentStock: 32.5, minStock: 15, maxStock: 60, unitCost: 28000, costPerUnit: 28000, isActive: true },
    { id: '2', code: 'INS-02', sku: 'INS-02', name: 'Pan Hamburguesa Brioche', category: 'Panadería', unit: 'Unidad', currentStock: 140, minStock: 50, maxStock: 250, unitCost: 1200, costPerUnit: 1200, isActive: true },
    { id: '3', code: 'INS-03', sku: 'INS-03', name: 'Queso Cheddar Tajado', category: 'Lácteos', unit: 'Paquete', currentStock: 6, minStock: 10, maxStock: 30, unitCost: 15000, costPerUnit: 15000, isActive: true },
    { id: '4', code: 'INS-04', sku: 'INS-04', name: 'Queso Mozzarella de Búfala', category: 'Lácteos', unit: 'Kg', currentStock: 12.0, minStock: 8, maxStock: 30, unitCost: 32000, costPerUnit: 32000, isActive: true },
    { id: '5', code: 'INS-05', sku: 'INS-05', name: 'Masa de Pizza Precocida', category: 'Panadería', unit: 'Unidad', currentStock: 45, minStock: 20, maxStock: 100, unitCost: 3500, costPerUnit: 3500, isActive: true },
    { id: '6', code: 'INS-06', sku: 'INS-06', name: 'Pepperoni Italiano Tajado', category: 'Embutidos', unit: 'Kg', currentStock: 4.2, minStock: 5, maxStock: 20, unitCost: 45000, costPerUnit: 45000, isActive: true },
    { id: '7', code: 'INS-07', sku: 'INS-07', name: 'Papas Criollas para Freír', category: 'Verduras', unit: 'Kg', currentStock: 50.0, minStock: 20, maxStock: 100, unitCost: 4000, costPerUnit: 4000, isActive: true },
    { id: '8', code: 'INS-08', sku: 'INS-08', name: 'Salsa BBQ Ahumada', category: 'Salsas', unit: 'Litro', currentStock: 8.5, minStock: 4, maxStock: 20, unitCost: 12000, costPerUnit: 12000, isActive: true },
    { id: '9', code: 'INS-09', sku: 'INS-09', name: 'Coca-Cola Zero 400ml', category: 'Bebidas', unit: 'Unidad', currentStock: 18, minStock: 48, maxStock: 200, unitCost: 2200, costPerUnit: 2200, isActive: true },
    { id: '10', code: 'INS-10', sku: 'INS-10', name: 'Huevos Tipo AA de Campo', category: 'Huevos & Granja', unit: 'Unidad', currentStock: 80, minStock: 30, maxStock: 180, unitCost: 750, costPerUnit: 750, isActive: true },
    { id: '11', code: 'INS-11', sku: 'INS-11', name: 'Tocineta Ahumada en Tiras', category: 'Carnes', unit: 'Kg', currentStock: 9.5, minStock: 4, maxStock: 25, unitCost: 32000, costPerUnit: 32000, isActive: true },
  ];

  for (const inv of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: inv.id },
      update: inv,
      create: inv,
    });
  }
  console.log(`✅ ${inventoryItems.length} insumos de inventario sincronizados en Neon.`);

  // 6. Caja registradora activa
  await prisma.cashRegister.upsert({
    where: { id: 'reg-principal' },
    update: {
      name: 'Caja Principal (POS)',
      openedBy: 'Laura Gómez (Cajera)',
      openedAt: Date.now() - 3600000,
      initialAmount: 250000,
      currentAmount: 850000,
      isOpen: true,
    },
    create: {
      id: 'reg-principal',
      name: 'Caja Principal (POS)',
      openedBy: 'Laura Gómez (Cajera)',
      openedAt: Date.now() - 3600000,
      initialAmount: 250000,
      currentAmount: 850000,
      isOpen: true,
    }
  });
  console.log('✅ Caja principal abierta y lista en Neon.');

  // 7. Pedidos de demostración
  const orders = [
    {
      id: '1024',
      orderNumber: '1024',
      createdAt: Date.now() - 2400000,
      tableId: '2',
      tableName: 'Mesa 2',
      waiterId: '2',
      waiterName: 'Carlos Ruiz',
      status: 'EN_PREPARACION',
      type: 'MESA',
      items: [
        {
          id: 'i1',
          productId: '1',
          productName: 'Hamburguesa Clásica',
          quantity: 2,
          unitPrice: 22000,
          totalPrice: 44000,
          modifiers: [{ modifierGroupId: 'm1', modifierOptionId: 'o1', name: 'Queso Extra', price: 3500 }]
        },
        {
          id: 'i2',
          productId: '8',
          productName: 'Papas Rústicas a la Francesa',
          quantity: 1,
          unitPrice: 10000,
          totalPrice: 10000,
          modifiers: []
        },
        {
          id: 'i3',
          productId: '10',
          productName: 'Coca-Cola Zero 400ml',
          quantity: 2,
          unitPrice: 6000,
          totalPrice: 12000,
          modifiers: []
        }
      ],
      subtotal: 69500,
      discount: 0,
      tax: 0,
      total: 69500
    },
    {
      id: '1025',
      orderNumber: '1025',
      createdAt: Date.now() - 1800000,
      tableId: '3',
      tableName: 'Mesa 3',
      waiterId: '2',
      waiterName: 'Carlos Ruiz',
      status: 'LISTO',
      type: 'MESA',
      items: [
        {
          id: 'i4',
          productId: '5',
          productName: 'Pizza Pepperoni Suprema',
          quantity: 1,
          unitPrice: 38000,
          totalPrice: 38000,
          modifiers: []
        },
        {
          id: 'i5',
          productId: '12',
          productName: 'Cerveza Artesanal IPA 330ml',
          quantity: 2,
          unitPrice: 14000,
          totalPrice: 28000,
          modifiers: []
        }
      ],
      subtotal: 66000,
      discount: 0,
      tax: 0,
      total: 66000
    }
  ];

  for (const o of orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {
        ...o,
        items: o.items,
      },
      create: {
        ...o,
        items: o.items,
      }
    });
  }
  console.log(`✅ ${orders.length} pedidos activos en vivo sembrados.`);

  console.log('🎉 Sincronización exitosa con Neon PostgreSQL.');
}

main()
  .catch((e) => {
    console.error('❌ Error sembrando base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
