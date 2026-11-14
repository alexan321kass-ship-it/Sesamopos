import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats() {
    const [orders, tables, deliveries, inventory, reservations, users] = await Promise.all([
      this.db.getAll<any>('orders'),
      this.db.getAll<any>('tables'),
      this.db.getAll<any>('deliveries'),
      this.db.getAll<any>('inventory'),
      this.db.getAll<any>('reservations'),
      this.db.getAll<any>('users'),
    ]);

    // 1. Sales & Orders Calculations
    const validOrders = orders.filter(o => o.status !== 'CANCELADO');
    const validDeliveries = deliveries.filter(d => d.deliveryStatus !== 'CANCELADO' && d.status !== 'CANCELADO');
    const tableSales = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const deliverySales = validDeliveries.reduce((sum, d) => sum + (Number(d.total) || 0), 0);
    const totalSales = tableSales + deliverySales;
    const totalOrdersCount = validOrders.length + validDeliveries.length;
    const avgTicket = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;

    // 2. Tables & Occupancy
    const occupiedTables = tables.filter(t => t.status === 'OCUPADA' || t.status === 'PEDIDO_LISTO').length;
    const reservedTables = tables.filter(t => t.status === 'RESERVADA').length;
    const availableTables = tables.filter(t => t.status === 'DISPONIBLE').length;
    const occupancyRate = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;

    // 3. Operational Counts
    const criticalStockItems = inventory.filter(i => Number(i.currentStock) <= Number(i.minStock));
    const pendingReservations = reservations.filter(r => r.status === 'PENDIENTE');
    const activeKitchenOrders = orders.filter(o => ['CREADO', 'EN_PREPARACION', 'LISTO'].includes(o.status));
    const activeDeliveries = deliveries.filter(d => ['EN_PREPARACION', 'EN_CAMINO'].includes(d.deliveryStatus));
    const staffOnDuty = users.filter(u => u.isActive);

    // 4. Hourly Sales Distribution (12:00 - 22:00)
    const hourlyMap: { [hour: string]: { ventas: number; pedidos: number } } = {
      '12:00': { ventas: 0, pedidos: 0 },
      '13:00': { ventas: 0, pedidos: 0 },
      '14:00': { ventas: 0, pedidos: 0 },
      '15:00': { ventas: 0, pedidos: 0 },
      '16:00': { ventas: 0, pedidos: 0 },
      '17:00': { ventas: 0, pedidos: 0 },
      '18:00': { ventas: 0, pedidos: 0 },
      '19:00': { ventas: 0, pedidos: 0 },
      '20:00': { ventas: 0, pedidos: 0 },
      '21:00': { ventas: 0, pedidos: 0 },
    };

    orders.forEach(o => {
      if (o.createdAt) {
        const d = new Date(Number(o.createdAt));
        const hour = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyMap[hour]) {
          hourlyMap[hour].ventas += Number(o.total) || 0;
          hourlyMap[hour].pedidos += 1;
        } else {
          // If out of range, assign to current lunch or dinner block
          hourlyMap['13:00'].ventas += Number(o.total) || 0;
          hourlyMap['13:00'].pedidos += 1;
        }
      }
    });

    deliveries.forEach(d => {
      if (d.createdAt) {
        const date = new Date(Number(d.createdAt));
        const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyMap[hour]) {
          hourlyMap[hour].ventas += Number(d.total) || 0;
          hourlyMap[hour].pedidos += 1;
        } else {
          hourlyMap['13:00'].ventas += Number(d.total) || 0;
          hourlyMap['13:00'].pedidos += 1;
        }
      }
    });

    const hourlySales = Object.entries(hourlyMap).map(([hora, val]) => ({
      hora,
      ventas: val.ventas,
      pedidos: val.pedidos,
    }));

    // 5. Top Dishes Ranking
    const dishSalesMap: { [name: string]: { cantidad: number; total: number } } = {};

    orders.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const name = it.productName || 'Plato';
        if (!dishSalesMap[name]) {
          dishSalesMap[name] = { cantidad: 0, total: 0 };
        }
        dishSalesMap[name].cantidad += Number(it.quantity) || 1;
        dishSalesMap[name].total += Number(it.totalPrice || it.unitPrice * it.quantity) || 0;
      });
    });

    deliveries.forEach(d => {
      (d.items || []).forEach((it: any) => {
        const name = it.productName || 'Plato';
        if (!dishSalesMap[name]) {
          dishSalesMap[name] = { cantidad: 0, total: 0 };
        }
        dishSalesMap[name].cantidad += Number(it.quantity) || 1;
        dishSalesMap[name].total += Number(it.totalPrice || it.unitPrice * it.quantity) || 0;
      });
    });

    const topDishes = Object.entries(dishSalesMap)
      .map(([nombre, stat]) => ({
        nombre,
        cantidad: stat.cantidad,
        total: stat.total,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);

    return {
      connected: true,
      engine: 'PostgreSQL 18 (Prisma)',
      timestamp: Date.now(),
      kpis: {
        totalSales,
        tableSales,
        deliverySales,
        totalOrdersCount,
        avgTicket,
        tablesCount: tables.length,
        occupiedTables,
        reservedTables,
        availableTables,
        occupancyRate,
        criticalStockCount: criticalStockItems.length,
        pendingReservationsCount: pendingReservations.length,
        activeKitchenCount: activeKitchenOrders.length,
        activeDeliveriesCount: activeDeliveries.length,
        staffOnDutyCount: staffOnDuty.length,
      },
      hourlySales,
      topDishes,
      tables,
      orders,
      deliveries,
      inventory,
      reservations,
      criticalInventory: criticalStockItems,
      liveKitchenQueue: activeKitchenOrders,
      liveDeliveries: activeDeliveries,
      pendingReservations,
    };
  }
}
