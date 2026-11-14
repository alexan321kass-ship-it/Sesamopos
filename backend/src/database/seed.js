import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function hashPwd(plain) {
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(plain)) return plain;
  return bcrypt.hashSync(plain, 10);
}

async function main() {
  console.log('🌱 Iniciando migración y siembra de datos a PostgreSQL...');
  
  const dbPath = path.resolve(process.cwd(), 'database.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ database.json no encontrado en', dbPath);
    return;
  }

  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(rawData);

  // 1. Users
  if (Array.isArray(db.users)) {
    console.log(`👤 Migrando ${db.users.length} usuarios con contraseñas hasheadas...`);
    for (const u of db.users) {
      const hashedPassword = hashPwd(u.password);
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          password: hashedPassword,
          role: u.role,
          isActive: u.isActive ?? true,
        },
        create: {
          id: String(u.id),
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          isActive: u.isActive ?? true,
        },
      });
    }
  }

  // 2. Categories
  if (Array.isArray(db.categories)) {
    console.log(`📁 Migrando ${db.categories.length} categorías...`);
    for (const c of db.categories) {
      await prisma.category.upsert({
        where: { id: String(c.id) },
        update: {
          name: c.name,
          description: c.description ?? null,
          isActive: c.isActive ?? true,
        },
        create: {
          id: String(c.id),
          name: c.name,
          description: c.description ?? null,
          isActive: c.isActive ?? true,
        },
      });
    }
  }

  // 3. Products
  if (Array.isArray(db.products)) {
    console.log(`🍔 Migrando ${db.products.length} productos...`);
    for (const p of db.products) {
      await prisma.product.upsert({
        where: { id: String(p.id) },
        update: {
          sku: p.sku ?? null,
          name: p.name,
          description: p.description ?? null,
          price: Number(p.price) || 0,
          cost: p.cost ? Number(p.cost) : null,
          imageUrl: p.imageUrl ?? null,
          tags: p.tags ?? null,
          rating: p.rating ? Number(p.rating) : null,
          calories: p.calories ? String(p.calories) : null,
          isAvailable: p.isAvailable ?? true,
          isActive: p.isActive ?? true,
          categoryId: p.categoryId ? String(p.categoryId) : null,
        },
        create: {
          id: String(p.id),
          sku: p.sku ?? null,
          name: p.name,
          description: p.description ?? null,
          price: Number(p.price) || 0,
          cost: p.cost ? Number(p.cost) : null,
          imageUrl: p.imageUrl ?? null,
          tags: p.tags ?? null,
          rating: p.rating ? Number(p.rating) : null,
          calories: p.calories ? String(p.calories) : null,
          isAvailable: p.isAvailable ?? true,
          isActive: p.isActive ?? true,
          categoryId: p.categoryId ? String(p.categoryId) : null,
        },
      });
    }
  }

  // 4. Tables
  if (Array.isArray(db.tables)) {
    console.log(`🪑 Migrando ${db.tables.length} mesas...`);
    for (const t of db.tables) {
      await prisma.table.upsert({
        where: { number: Number(t.number) },
        update: {
          capacity: Number(t.capacity) || 4,
          location: t.location ?? 'Salón Principal',
          status: t.status ?? 'DISPONIBLE',
          currentOrderId: t.currentOrderId ? String(t.currentOrderId) : null,
          currentWaiterId: t.currentWaiterId ? String(t.currentWaiterId) : null,
          currentWaiterName: t.currentWaiterName ?? null,
          timeOccupied: t.timeOccupied ? Number(t.timeOccupied) : null,
        },
        create: {
          id: String(t.id),
          number: Number(t.number),
          capacity: Number(t.capacity) || 4,
          location: t.location ?? 'Salón Principal',
          status: t.status ?? 'DISPONIBLE',
          currentOrderId: t.currentOrderId ? String(t.currentOrderId) : null,
          currentWaiterId: t.currentWaiterId ? String(t.currentWaiterId) : null,
          currentWaiterName: t.currentWaiterName ?? null,
          timeOccupied: t.timeOccupied ? Number(t.timeOccupied) : null,
        },
      });
    }
  }

  // 5. Orders
  if (Array.isArray(db.orders)) {
    console.log(`🧾 Migrando ${db.orders.length} pedidos...`);
    for (const o of db.orders) {
      await prisma.order.upsert({
        where: { id: String(o.id) },
        update: {
          orderNumber: o.orderNumber ? String(o.orderNumber) : null,
          createdAt: o.createdAt ? Number(o.createdAt) : Date.now(),
          updatedAt: o.updatedAt ? Number(o.updatedAt) : null,
          tableId: o.tableId ? String(o.tableId) : null,
          tableName: o.tableName ?? null,
          waiterId: o.waiterId ? String(o.waiterId) : null,
          waiterName: o.waiterName ?? null,
          customerName: o.customerName ?? null,
          status: o.status ?? 'CREADO',
          type: o.type ?? 'MESA',
          items: o.items ?? [],
          subtotal: Number(o.subtotal) || 0,
          discount: Number(o.discount) || 0,
          tax: Number(o.tax) || 0,
          total: Number(o.total) || 0,
          paymentMethod: o.paymentMethod ?? null,
        },
        create: {
          id: String(o.id),
          orderNumber: o.orderNumber ? String(o.orderNumber) : null,
          createdAt: o.createdAt ? Number(o.createdAt) : Date.now(),
          updatedAt: o.updatedAt ? Number(o.updatedAt) : null,
          tableId: o.tableId ? String(o.tableId) : null,
          tableName: o.tableName ?? null,
          waiterId: o.waiterId ? String(o.waiterId) : null,
          waiterName: o.waiterName ?? null,
          customerName: o.customerName ?? null,
          status: o.status ?? 'CREADO',
          type: o.type ?? 'MESA',
          items: o.items ?? [],
          subtotal: Number(o.subtotal) || 0,
          discount: Number(o.discount) || 0,
          tax: Number(o.tax) || 0,
          total: Number(o.total) || 0,
          paymentMethod: o.paymentMethod ?? null,
        },
      });
    }
  }

  // 6. Deliveries
  if (Array.isArray(db.deliveries)) {
    console.log(`🛵 Migrando ${db.deliveries.length} domicilios...`);
    for (const d of db.deliveries) {
      await prisma.delivery.upsert({
        where: { id: String(d.id) },
        update: {
          orderNumber: d.orderNumber ? String(d.orderNumber) : null,
          customer: d.customer ?? null,
          items: d.items ?? [],
          subtotal: Number(d.subtotal) || 0,
          deliveryFee: Number(d.deliveryFee) || 0,
          total: Number(d.total) || 0,
          paymentMethod: d.paymentMethod ?? null,
          cashGiven: d.cashGiven ? Number(d.cashGiven) : null,
          changeDue: d.changeDue ? Number(d.changeDue) : null,
          deliveryStatus: d.deliveryStatus ?? 'PENDIENTE',
          riderName: d.riderName ?? null,
          riderPhone: d.riderPhone ?? null,
          dispatchTime: d.dispatchTime ? String(d.dispatchTime) : null,
          estimatedDeliveryTime: d.estimatedDeliveryTime ? String(d.estimatedDeliveryTime) : null,
          notes: d.notes ?? null,
          createdAt: d.createdAt ? Number(d.createdAt) : Date.now(),
        },
        create: {
          id: String(d.id),
          orderNumber: d.orderNumber ? String(d.orderNumber) : null,
          customer: d.customer ?? null,
          items: d.items ?? [],
          subtotal: Number(d.subtotal) || 0,
          deliveryFee: Number(d.deliveryFee) || 0,
          total: Number(d.total) || 0,
          paymentMethod: d.paymentMethod ?? null,
          cashGiven: d.cashGiven ? Number(d.cashGiven) : null,
          changeDue: d.changeDue ? Number(d.changeDue) : null,
          deliveryStatus: d.deliveryStatus ?? 'PENDIENTE',
          riderName: d.riderName ?? null,
          riderPhone: d.riderPhone ?? null,
          dispatchTime: d.dispatchTime ? String(d.dispatchTime) : null,
          estimatedDeliveryTime: d.estimatedDeliveryTime ? String(d.estimatedDeliveryTime) : null,
          notes: d.notes ?? null,
          createdAt: d.createdAt ? Number(d.createdAt) : Date.now(),
        },
      });
    }
  }

  // 7. Inventory
  if (Array.isArray(db.inventory)) {
    console.log(`📦 Migrando ${db.inventory.length} ítems de inventario...`);
    for (const inv of db.inventory) {
      await prisma.inventoryItem.upsert({
        where: { id: String(inv.id) },
        update: {
          sku: inv.sku ?? null,
          code: inv.code ?? null,
          name: inv.name,
          category: inv.category ?? null,
          currentStock: Number(inv.currentStock) || 0,
          minStock: Number(inv.minStock) || 0,
          maxStock: inv.maxStock ? Number(inv.maxStock) : null,
          unit: inv.unit ?? 'unid',
          costPerUnit: Number(inv.costPerUnit || inv.unitCost) || 0,
          unitCost: Number(inv.unitCost || inv.costPerUnit) || 0,
          supplier: inv.supplier ?? null,
          isActive: inv.isActive ?? true,
        },
        create: {
          id: String(inv.id),
          sku: inv.sku ?? null,
          code: inv.code ?? null,
          name: inv.name,
          category: inv.category ?? null,
          currentStock: Number(inv.currentStock) || 0,
          minStock: Number(inv.minStock) || 0,
          maxStock: inv.maxStock ? Number(inv.maxStock) : null,
          unit: inv.unit ?? 'unid',
          costPerUnit: Number(inv.costPerUnit || inv.unitCost) || 0,
          unitCost: Number(inv.unitCost || inv.costPerUnit) || 0,
          supplier: inv.supplier ?? null,
          isActive: inv.isActive ?? true,
        },
      });
    }
  }

  // 8. Reservations
  if (Array.isArray(db.reservations)) {
    console.log(`📅 Migrando ${db.reservations.length} reservaciones...`);
    for (const r of db.reservations) {
      await prisma.reservation.upsert({
        where: { id: String(r.id) },
        update: {
          customerName: r.customerName,
          phone: r.phone ?? null,
          pax: Number(r.pax) || 2,
          date: r.date ?? null,
          time: r.time ?? null,
          tableId: r.tableId ? String(r.tableId) : null,
          status: r.status ?? 'PENDIENTE',
          notes: r.notes ?? null,
        },
        create: {
          id: String(r.id),
          customerName: r.customerName,
          phone: r.phone ?? null,
          pax: Number(r.pax) || 2,
          date: r.date ?? null,
          time: r.time ?? null,
          tableId: r.tableId ? String(r.tableId) : null,
          status: r.status ?? 'PENDIENTE',
          notes: r.notes ?? null,
        },
      });
    }
  }

  // 9. Cash Registers, Movements, History
  if (Array.isArray(db.cashRegisters)) {
    for (const cr of db.cashRegisters) {
      await prisma.cashRegister.upsert({
        where: { id: String(cr.id) },
        update: cr,
        create: cr,
      });
    }
  }

  if (Array.isArray(db.cashMovements)) {
    for (const cm of db.cashMovements) {
      await prisma.cashMovement.upsert({
        where: { id: String(cm.id) },
        update: cm,
        create: cm,
      });
    }
  }

  if (Array.isArray(db.cashHistory)) {
    for (const ch of db.cashHistory) {
      await prisma.cashHistory.upsert({
        where: { id: String(ch.id) },
        update: ch,
        create: ch,
      });
    }
  }

  console.log('✅ Migración y siembra de datos a PostgreSQL completada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
