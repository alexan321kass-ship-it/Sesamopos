import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as fsSync from 'fs';
import { hashPassword, isPasswordHashed } from '../common/utils/hash.util.js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get dbJsonPath(): string {
    const cwd = process.cwd();
    if (fsSync.existsSync(path.resolve(cwd, 'database.json'))) {
      return path.resolve(cwd, 'database.json');
    }
    if (fsSync.existsSync(path.resolve(cwd, 'backend', 'database.json'))) {
      return path.resolve(cwd, 'backend', 'database.json');
    }
    return path.resolve(cwd, 'database.json');
  }

  async onModuleInit() {
    try {
      const userCount = await this.prisma.user.count();
      const productCount = await this.prisma.product.count();
      this.logger.log(`🐘 Conectado a PostgreSQL en sesamo DB (${userCount} usuarios, ${productCount} productos registrados).`);
      if (userCount === 0 || productCount === 0) {
        this.logger.log('🌱 Inicializando o completando siembra de datos desde database.json...');
        await this.seedFromDatabaseJson();
      } else {
        this.logger.log('✨ Base de datos ya inicializada con datos. Omitiendo sobrescritura de seed.');
      }
      await this.upgradePlainTextPasswords();
    } catch (err: any) {
      this.logger.warn(`⚠️ Error conectando a PostgreSQL en onModuleInit: ${err?.message}`);
    }
  }

  private async upgradePlainTextPasswords() {
    try {
      const users = await this.prisma.user.findMany();
      for (const u of users) {
        if (u.password && !isPasswordHashed(u.password)) {
          const hashed = await hashPassword(u.password);
          await this.prisma.user.update({
            where: { id: u.id },
            data: { password: hashed },
          });
          this.logger.log(`🔒 Contraseña del usuario ${u.email} actualizada a hash seguro.`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Error al verificar hashes de contraseñas: ${err?.message}`);
    }
  }

  private async seedFromDatabaseJson() {
    try {
      if (!fsSync.existsSync(this.dbJsonPath)) return;
      this.logger.log('🌱 Sembrando / sincronizando base de datos PostgreSQL desde database.json...');
      const raw = await fs.readFile(this.dbJsonPath, 'utf-8');
      const db = JSON.parse(raw);

      if (Array.isArray(db.users)) {
        for (const u of db.users) {
          const hashedPassword = u.password
            ? (isPasswordHashed(u.password) ? u.password : await hashPassword(u.password))
            : await hashPassword('password123');
          await this.prisma.user.upsert({
            where: { email: u.email },
            update: {
              name: u.name,
              password: hashedPassword,
              role: u.role,
              isActive: u.isActive ?? true,
              phone: u.phone ?? null,
              documentId: u.documentId ?? null,
              pin: u.pin ?? null,
              avatarUrl: u.avatarUrl ?? null,
              hireDate: u.hireDate ?? null,
              hourlyRate: u.hourlyRate !== undefined ? Number(u.hourlyRate) : null,
              shiftStatus: u.shiftStatus ?? 'FUERA_DE_TURNO',
              shiftStartTime: u.shiftStartTime ?? null,
              assignedArea: u.assignedArea ?? null,
              permissions: u.permissions ?? null,
              stats: u.stats ?? null,
            },
            create: {
              id: String(u.id),
              name: u.name,
              email: u.email,
              password: hashedPassword,
              role: u.role,
              isActive: u.isActive ?? true,
              phone: u.phone ?? null,
              documentId: u.documentId ?? null,
              pin: u.pin ?? null,
              avatarUrl: u.avatarUrl ?? null,
              hireDate: u.hireDate ?? null,
              hourlyRate: u.hourlyRate !== undefined ? Number(u.hourlyRate) : null,
              shiftStatus: u.shiftStatus ?? 'FUERA_DE_TURNO',
              shiftStartTime: u.shiftStartTime ?? null,
              assignedArea: u.assignedArea ?? null,
              permissions: u.permissions ?? null,
              stats: u.stats ?? null,
            },
          });
        }
      }

      if (Array.isArray(db.categories)) {
        for (const c of db.categories) {
          await this.prisma.category.upsert({
            where: { id: String(c.id) },
            update: { name: c.name, description: c.description ?? null, isActive: c.isActive ?? true },
            create: { id: String(c.id), name: c.name, description: c.description ?? null, isActive: c.isActive ?? true },
          });
        }
      }

      if (Array.isArray(db.products)) {
        for (const p of db.products) {
          await this.prisma.product.upsert({
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

      if (Array.isArray(db.tables)) {
        for (const t of db.tables) {
          await this.prisma.table.upsert({
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

      if (Array.isArray(db.orders)) {
        for (const o of db.orders) {
          await this.prisma.order.upsert({
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

      if (Array.isArray(db.deliveries)) {
        for (const d of db.deliveries) {
          await this.prisma.delivery.upsert({
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

      if (Array.isArray(db.inventory)) {
        for (const inv of db.inventory) {
          await this.prisma.inventoryItem.upsert({
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

      if (Array.isArray(db.reservations)) {
        for (const r of db.reservations) {
          await this.prisma.reservation.upsert({
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

      this.logger.log('✅ Siembra completada exitosamente.');
    } catch (err: any) {
      this.logger.error(`Error en seed: ${err?.message}`, err?.stack);
    }
  }

  async getAll<T>(entity: string): Promise<T[]> {
    switch (entity) {
      case 'users':
        return (await this.prisma.user.findMany({ orderBy: { name: 'asc' } })) as unknown as T[];
      case 'shifts':
        return (await this.prisma.staffShift.findMany({ orderBy: { date: 'desc' } })) as unknown as T[];
      case 'categories':
        return (await this.prisma.category.findMany({ orderBy: { name: 'asc' } })) as unknown as T[];
      case 'products':
        return (await this.prisma.product.findMany({
          include: { category: true },
          orderBy: { name: 'asc' },
        })) as unknown as T[];
      case 'tables':
        return (await this.prisma.table.findMany({ orderBy: { number: 'asc' } })) as unknown as T[];
      case 'orders':
        return (await this.prisma.order.findMany({ orderBy: { createdAt: 'desc' } })) as unknown as T[];
      case 'cashRegisters':
        return (await this.prisma.cashRegister.findMany({ orderBy: { openedAt: 'desc' } })) as unknown as T[];
      case 'cashMovements':
        return (await this.prisma.cashMovement.findMany({ orderBy: { date: 'desc' } })) as unknown as T[];
      case 'cashHistory':
        return (await this.prisma.cashHistory.findMany({ orderBy: { closedAt: 'desc' } })) as unknown as T[];
      case 'deliveries':
        return (await this.prisma.delivery.findMany({ orderBy: { createdAt: 'desc' } })) as unknown as T[];
      case 'inventory':
        return (await this.prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } })) as unknown as T[];
      case 'reservations':
        return (await this.prisma.reservation.findMany({ orderBy: { date: 'asc' } })) as unknown as T[];
      default:
        this.logger.warn(`Entidad desconocida en getAll: ${entity}`);
        return [];
    }
  }

  async addOne<T>(entity: string, item: any): Promise<T> {
    const id = item.id ? String(item.id) : undefined;
    switch (entity) {
      case 'users': {
        const password = item.password
          ? (isPasswordHashed(item.password) ? item.password : await hashPassword(item.password))
          : await hashPassword('password123');
        return (await this.prisma.user.create({
          data: {
            id,
            name: item.name,
            email: item.email,
            password,
            role: item.role || 'MESERO',
            isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
            phone: item.phone ?? null,
            documentId: item.documentId ?? null,
            pin: item.pin ?? null,
            avatarUrl: item.avatarUrl ?? null,
            hireDate: item.hireDate ?? null,
            hourlyRate: item.hourlyRate !== undefined ? Number(item.hourlyRate) : null,
            shiftStatus: item.shiftStatus ?? 'FUERA_DE_TURNO',
            shiftStartTime: item.shiftStartTime ?? null,
            assignedArea: item.assignedArea ?? null,
            permissions: item.permissions ?? null,
            stats: item.stats ?? null,
          },
        })) as unknown as T;
      }
      case 'shifts': {
        return (await this.prisma.staffShift.create({
          data: {
            id,
            staffId: String(item.staffId),
            staffName: item.staffName || '',
            role: item.role || '',
            date: item.date || new Date().toISOString().split('T')[0],
            checkIn: item.checkIn || '',
            checkOut: item.checkOut ?? null,
            status: item.status || 'ACTIVO',
            hoursWorked: item.hoursWorked !== undefined ? Number(item.hoursWorked) : 0,
            notes: item.notes ?? null,
          },
        })) as unknown as T;
      }
      case 'categories':
        return (await this.prisma.category.create({ data: { ...item, id } })) as unknown as T;
      case 'products':
        return (await this.prisma.product.create({
          data: {
            ...item,
            id,
            price: Number(item.price) || 0,
            cost: item.cost ? Number(item.cost) : null,
          },
        })) as unknown as T;
      case 'tables': {
        const num = Number(item.number);
        const capacity = Number(item.capacity) || 4;
        return (await this.prisma.table.create({
          data: {
            id,
            number: num,
            capacity,
            location: item.location || 'Salón Principal',
            status: item.status || 'DISPONIBLE',
            currentOrderId: item.currentOrderId ? String(item.currentOrderId) : null,
            currentWaiterId: item.currentWaiterId ? String(item.currentWaiterId) : null,
            currentWaiterName: item.currentWaiterName ?? null,
            timeOccupied: item.timeOccupied ? Number(item.timeOccupied) : null,
          },
        })) as unknown as T;
      }
      case 'orders':
        return (await this.prisma.order.create({
          data: {
            id,
            orderNumber: item.orderNumber ? String(item.orderNumber) : null,
            createdAt: item.createdAt ? Number(item.createdAt) : Date.now(),
            updatedAt: item.updatedAt ? Number(item.updatedAt) : null,
            tableId: item.tableId ? String(item.tableId) : null,
            tableName: item.tableName ?? null,
            waiterId: item.waiterId ? String(item.waiterId) : null,
            waiterName: item.waiterName ?? null,
            customerName: item.customerName ?? null,
            status: item.status ?? 'CREADO',
            type: item.type ?? 'MESA',
            items: item.items ?? [],
            subtotal: Number(item.subtotal) || 0,
            discount: Number(item.discount) || 0,
            tax: Number(item.tax) || 0,
            total: Number(item.total) || 0,
            paymentMethod: item.paymentMethod ?? null,
          },
        })) as unknown as T;
      case 'cashRegisters':
        return (await this.prisma.cashRegister.create({
          data: {
            ...item,
            id,
            openedAt: Number(item.openedAt) || Date.now(),
            initialAmount: Number(item.initialAmount) || 0,
            currentAmount: Number(item.currentAmount) || 0,
          },
        })) as unknown as T;
      case 'cashMovements':
        return (await this.prisma.cashMovement.create({
          data: {
            ...item,
            id,
            amount: Number(item.amount) || 0,
            date: Number(item.date) || Date.now(),
          },
        })) as unknown as T;
      case 'cashHistory':
        return (await this.prisma.cashHistory.create({
          data: {
            ...item,
            id,
            openedAt: Number(item.openedAt) || Date.now(),
            closedAt: Number(item.closedAt) || Date.now(),
            initialAmount: Number(item.initialAmount) || 0,
            countedCash: Number(item.countedCash) || 0,
          },
        })) as unknown as T;
      case 'deliveries':
        return (await this.prisma.delivery.create({
          data: {
            id,
            orderNumber: item.orderNumber ? String(item.orderNumber) : null,
            customer: item.customer ?? null,
            items: item.items ?? [],
            subtotal: Number(item.subtotal) || 0,
            deliveryFee: Number(item.deliveryFee) || 0,
            total: Number(item.total) || 0,
            paymentMethod: item.paymentMethod ?? null,
            cashGiven: item.cashGiven ? Number(item.cashGiven) : null,
            changeDue: item.changeDue ? Number(item.changeDue) : null,
            deliveryStatus: item.deliveryStatus || item.status || 'PENDIENTE',
            riderName: item.riderName || item.deliveryRiderName || null,
            riderPhone: item.riderPhone || item.deliveryRiderPhone || null,
            dispatchTime: item.dispatchTime ? String(item.dispatchTime) : null,
            estimatedDeliveryTime: item.estimatedDeliveryTime ? String(item.estimatedDeliveryTime) : null,
            notes: item.notes || item.deliveryNotes || null,
            createdAt: item.createdAt ? Number(item.createdAt) : Date.now(),
          },
        })) as unknown as T;
      case 'inventory':
        return (await this.prisma.inventoryItem.create({
          data: {
            ...item,
            id,
            currentStock: Number(item.currentStock) || 0,
            minStock: Number(item.minStock) || 0,
          },
        })) as unknown as T;
      case 'reservations':
        return (await this.prisma.reservation.create({
          data: {
            ...item,
            id,
            pax: Number(item.pax) || 2,
          },
        })) as unknown as T;
      default:
        this.logger.warn(`Entidad desconocida en addOne: ${entity}`);
        return item;
    }
  }

  async updateOne<T>(entity: string, id: string, updater: (item: T) => T): Promise<T | null> {
    const strId = String(id);
    switch (entity) {
      case 'users': {
        const current = await this.prisma.user.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        let password = updated.password;
        if (password && password !== current.password && !isPasswordHashed(password)) {
          password = await hashPassword(password);
        }
        return (await this.prisma.user.update({
          where: { id: strId },
          data: {
            name: updated.name !== undefined ? updated.name : undefined,
            email: updated.email !== undefined ? updated.email : undefined,
            password: password !== undefined ? password : undefined,
            role: updated.role !== undefined ? updated.role : undefined,
            isActive: updated.isActive !== undefined ? Boolean(updated.isActive) : undefined,
            phone: updated.phone !== undefined ? updated.phone : undefined,
            documentId: updated.documentId !== undefined ? updated.documentId : undefined,
            pin: updated.pin !== undefined ? updated.pin : undefined,
            avatarUrl: updated.avatarUrl !== undefined ? updated.avatarUrl : undefined,
            hireDate: updated.hireDate !== undefined ? updated.hireDate : undefined,
            hourlyRate: updated.hourlyRate !== undefined ? Number(updated.hourlyRate) : undefined,
            shiftStatus: updated.shiftStatus !== undefined ? updated.shiftStatus : undefined,
            shiftStartTime: updated.shiftStartTime !== undefined ? updated.shiftStartTime : undefined,
            assignedArea: updated.assignedArea !== undefined ? updated.assignedArea : undefined,
            permissions: updated.permissions !== undefined ? updated.permissions : undefined,
            stats: updated.stats !== undefined ? updated.stats : undefined,
          },
        })) as unknown as T;
      }
      case 'shifts': {
        const current = await this.prisma.staffShift.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.staffShift.update({
          where: { id: strId },
          data: {
            staffName: updated.staffName !== undefined ? updated.staffName : undefined,
            role: updated.role !== undefined ? updated.role : undefined,
            date: updated.date !== undefined ? updated.date : undefined,
            checkIn: updated.checkIn !== undefined ? updated.checkIn : undefined,
            checkOut: updated.checkOut !== undefined ? updated.checkOut : undefined,
            status: updated.status !== undefined ? updated.status : undefined,
            hoursWorked: updated.hoursWorked !== undefined ? Number(updated.hoursWorked) : undefined,
            notes: updated.notes !== undefined ? updated.notes : undefined,
          },
        })) as unknown as T;
      }
      case 'orders': {
        const current = await this.prisma.order.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.order.update({
          where: { id: strId },
          data: {
            status: updated.status,
            updatedAt: Date.now(),
            items: updated.items,
            subtotal: updated.subtotal !== undefined ? Number(updated.subtotal) : undefined,
            discount: updated.discount !== undefined ? Number(updated.discount) : undefined,
            tax: updated.tax !== undefined ? Number(updated.tax) : undefined,
            total: updated.total !== undefined ? Number(updated.total) : undefined,
            paymentMethod: updated.paymentMethod,
          },
        })) as unknown as T;
      }
      case 'tables': {
        const num = Number(id);
        const validNum = !isNaN(num) && num > 0 && num <= 2147483647 ? num : null;
        const current = (await this.prisma.table.findUnique({ where: { id: strId } }).catch(() => null)) ||
          (validNum !== null ? await this.prisma.table.findFirst({ where: { number: validNum } }).catch(() => null) : null);
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.table.update({
          where: { id: current.id },
          data: {
            number: updated.number !== undefined ? Number(updated.number) : undefined,
            capacity: updated.capacity !== undefined ? Number(updated.capacity) : undefined,
            location: updated.location !== undefined ? updated.location : undefined,
            status: updated.status,
            currentOrderId: updated.currentOrderId,
            currentWaiterId: updated.currentWaiterId,
            currentWaiterName: updated.currentWaiterName,
            timeOccupied: updated.timeOccupied !== undefined ? Number(updated.timeOccupied) : undefined,
          },
        })) as unknown as T;
      }
      case 'cashRegisters': {
        const current = await this.prisma.cashRegister.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.cashRegister.update({
          where: { id: strId },
          data: updated,
        })) as unknown as T;
      }
      case 'deliveries': {
        const current = await this.prisma.delivery.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        const data: any = {};
        if (updated.orderNumber !== undefined) data.orderNumber = updated.orderNumber;
        if (updated.customer !== undefined) data.customer = updated.customer;
        if (updated.items !== undefined) data.items = updated.items;
        if (updated.subtotal !== undefined) data.subtotal = Number(updated.subtotal) || 0;
        if (updated.deliveryFee !== undefined) data.deliveryFee = Number(updated.deliveryFee) || 0;
        if (updated.total !== undefined) data.total = Number(updated.total) || 0;
        if (updated.paymentMethod !== undefined) data.paymentMethod = updated.paymentMethod;
        if (updated.cashGiven !== undefined) data.cashGiven = updated.cashGiven ? Number(updated.cashGiven) : null;
        if (updated.changeDue !== undefined) data.changeDue = updated.changeDue ? Number(updated.changeDue) : null;
        if (updated.deliveryStatus !== undefined || updated.status !== undefined) {
          data.deliveryStatus = updated.deliveryStatus || updated.status;
        }
        if (updated.riderName !== undefined || updated.deliveryRiderName !== undefined) {
          data.riderName = updated.riderName || updated.deliveryRiderName;
        }
        if (updated.riderPhone !== undefined || updated.deliveryRiderPhone !== undefined) {
          data.riderPhone = updated.riderPhone || updated.deliveryRiderPhone;
        }
        if (updated.dispatchTime !== undefined) data.dispatchTime = updated.dispatchTime;
        if (updated.estimatedDeliveryTime !== undefined) data.estimatedDeliveryTime = String(updated.estimatedDeliveryTime);
        if (updated.notes !== undefined || updated.deliveryNotes !== undefined) {
          data.notes = updated.notes || updated.deliveryNotes;
        }
        return (await this.prisma.delivery.update({
          where: { id: strId },
          data,
        })) as unknown as T;
      }
      case 'inventory': {
        const current = await this.prisma.inventoryItem.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.inventoryItem.update({
          where: { id: strId },
          data: updated,
        })) as unknown as T;
      }
      case 'reservations': {
        const current = await this.prisma.reservation.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.reservation.update({
          where: { id: strId },
          data: updated,
        })) as unknown as T;
      }
      case 'categories': {
        const current = await this.prisma.category.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.category.update({
          where: { id: strId },
          data: {
            name: updated.name !== undefined ? updated.name : undefined,
            description: updated.description !== undefined ? updated.description : undefined,
            isActive: updated.isActive !== undefined ? Boolean(updated.isActive) : undefined,
          },
        })) as unknown as T;
      }
      case 'products': {
        const current = await this.prisma.product.findUnique({ where: { id: strId } });
        if (!current) return null;
        const updated = updater(current as unknown as T) as any;
        return (await this.prisma.product.update({
          where: { id: strId },
          data: {
            sku: updated.sku !== undefined ? updated.sku : undefined,
            name: updated.name !== undefined ? updated.name : undefined,
            description: updated.description !== undefined ? updated.description : undefined,
            price: updated.price !== undefined ? Number(updated.price) : undefined,
            cost: updated.cost !== undefined ? Number(updated.cost) : undefined,
            imageUrl: updated.imageUrl !== undefined ? updated.imageUrl : undefined,
            tags: updated.tags !== undefined ? updated.tags : undefined,
            rating: updated.rating !== undefined ? Number(updated.rating) : undefined,
            calories: updated.calories !== undefined ? String(updated.calories) : undefined,
            isAvailable: updated.isAvailable !== undefined ? Boolean(updated.isAvailable) : undefined,
            isActive: updated.isActive !== undefined ? Boolean(updated.isActive) : undefined,
            categoryId: updated.categoryId !== undefined ? (updated.categoryId ? String(updated.categoryId) : null) : undefined,
          },
        })) as unknown as T;
      }
      default: {
        const all = await this.getAll<any>(entity);
        const idx = all.findIndex((i) => String(i.id) === strId);
        if (idx === -1) return null;
        const updated = updater(all[idx]);
        all[idx] = updated;
        await this.setAll(entity, all);
        return updated as T;
      }
    }
  }

  async setAll<T>(entity: string, items: T[]): Promise<void> {
    switch (entity) {
      case 'cashMovements':
        await this.prisma.cashMovement.deleteMany();
        for (const it of items as any[]) {
          await this.prisma.cashMovement.create({
            data: {
              id: it.id ? String(it.id) : undefined,
              type: it.type,
              amount: Number(it.amount) || 0,
              reason: it.reason || '',
              date: Number(it.date) || Date.now(),
            },
          });
        }
        break;
      case 'tables':
        for (const it of items as any[]) {
          const num = Number(it.number);
          await this.prisma.table.upsert({
            where: { number: num },
            update: {
              status: it.status ?? 'DISPONIBLE',
              currentOrderId: it.currentOrderId ?? null,
              currentWaiterId: it.currentWaiterId ?? null,
              currentWaiterName: it.currentWaiterName ?? null,
              timeOccupied: it.timeOccupied ? Number(it.timeOccupied) : null,
              capacity: Number(it.capacity) || 4,
              location: it.location ?? 'Salón Principal',
            },
            create: {
              id: String(it.id || Date.now()),
              number: num,
              status: it.status ?? 'DISPONIBLE',
              currentOrderId: it.currentOrderId ?? null,
              currentWaiterId: it.currentWaiterId ?? null,
              currentWaiterName: it.currentWaiterName ?? null,
              timeOccupied: it.timeOccupied ? Number(it.timeOccupied) : null,
              capacity: Number(it.capacity) || 4,
              location: it.location ?? 'Salón Principal',
            },
          });
        }
        break;
      case 'cashRegisters':
        for (const it of items as any[]) {
          await this.prisma.cashRegister.upsert({
            where: { id: String(it.id) },
            update: {
              name: it.name,
              openedBy: it.openedBy,
              openedAt: Number(it.openedAt),
              initialAmount: Number(it.initialAmount) || 0,
              currentAmount: Number(it.currentAmount) || 0,
              isOpen: Boolean(it.isOpen),
              closedAt: it.closedAt ? Number(it.closedAt) : null,
              closedBy: it.closedBy ?? null,
              countedCash: it.countedCash ? Number(it.countedCash) : null,
              notes: it.notes ?? null,
            },
            create: {
              id: String(it.id),
              name: it.name,
              openedBy: it.openedBy,
              openedAt: Number(it.openedAt),
              initialAmount: Number(it.initialAmount) || 0,
              currentAmount: Number(it.currentAmount) || 0,
              isOpen: Boolean(it.isOpen),
              closedAt: it.closedAt ? Number(it.closedAt) : null,
              closedBy: it.closedBy ?? null,
              countedCash: it.countedCash ? Number(it.countedCash) : null,
              notes: it.notes ?? null,
            },
          });
        }
        break;
      default:
        for (const it of items as any[]) {
          if (it.id) {
            await this.addOne(entity, it).catch(() => {});
          }
        }
        break;
    }
  }

  async deleteOne(entity: string, id: string): Promise<boolean> {
    const strId = String(id);
    try {
      switch (entity) {
        case 'users':
          await this.prisma.user.delete({ where: { id: strId } });
          return true;
        case 'shifts':
          await this.prisma.staffShift.delete({ where: { id: strId } });
          return true;
        case 'categories':
          await this.prisma.category.delete({ where: { id: strId } });
          return true;
        case 'products':
          await this.prisma.product.delete({ where: { id: strId } });
          return true;
        case 'tables': {
          const num = Number(id);
          const validNum = !isNaN(num) && num > 0 && num <= 2147483647 ? num : null;
          const found = (await this.prisma.table.findUnique({ where: { id: strId } }).catch(() => null)) ||
            (validNum !== null ? await this.prisma.table.findFirst({ where: { number: validNum } }).catch(() => null) : null);
          if (found) {
            await this.prisma.table.delete({ where: { id: found.id } });
            return true;
          }
          return false;
        }
        case 'orders':
          await this.prisma.order.delete({ where: { id: strId } });
          return true;
        case 'inventory':
          await this.prisma.inventoryItem.delete({ where: { id: strId } });
          return true;
        case 'reservations':
          await this.prisma.reservation.delete({ where: { id: strId } });
          return true;
        case 'deliveries':
          await this.prisma.delivery.delete({ where: { id: strId } });
          return true;
        default:
          return false;
      }
    } catch (err: any) {
      this.logger.warn(`Error en deleteOne(${entity}, ${id}): ${err?.message}`);
      return false;
    }
  }
}

