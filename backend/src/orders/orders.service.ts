import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<any[]> {
    return this.db.getAll<any>('orders');
  }

  async create(orderData: any): Promise<any> {
    const newOrder = {
      ...orderData,
      id: orderData.id || Date.now().toString(),
      status: orderData.status || 'CREADO',
      createdAt: orderData.createdAt || Date.now(),
    };
    await this.db.addOne('orders', newOrder);

    // If order has tableId, update table status in database.json
    if (newOrder.tableId) {
      const tables = await this.db.getAll<any>('tables');
      const tIndex = tables.findIndex(t => t.id === newOrder.tableId || t.number.toString() === newOrder.tableId);
      if (tIndex !== -1) {
        tables[tIndex].status = 'OCUPADA';
        tables[tIndex].currentOrderId = newOrder.orderNumber;
        tables[tIndex].timeOccupied = Date.now();
        if (newOrder.waiterName) tables[tIndex].currentWaiterName = newOrder.waiterName;
        if (newOrder.waiterId) tables[tIndex].currentWaiterId = newOrder.waiterId;
        await this.db.setAll('tables', tables);
      }
    }

    return newOrder;
  }

  async updateStatus(id: string, status: string) {
    const updated = await this.db.updateOne<any>('orders', id, item => ({ ...item, status }));

    if (updated && updated.tableId) {
      const tables = await this.db.getAll<any>('tables');
      const tIndex = tables.findIndex(t => t.id === updated.tableId || t.number.toString() === updated.tableId);
      if (tIndex !== -1) {
        if (status === 'LISTO') {
          tables[tIndex].status = 'PEDIDO_LISTO';
        } else if (status === 'PAGADO') {
          tables[tIndex].status = 'DISPONIBLE';
          tables[tIndex].currentOrderId = undefined;
          tables[tIndex].timeOccupied = undefined;
        } else if (status === 'ENTREGADO' || status === 'EN_COCINA' || status === 'EN_PREPARACION' || status === 'CREADO') {
          tables[tIndex].status = 'OCUPADA';
        }
        await this.db.setAll('tables', tables);
      }
    }

    return updated;
  }

  async update(id: string, updateData: any) {
    const updated = await this.db.updateOne<any>('orders', id, item => ({ ...item, ...updateData, updatedAt: Date.now() }));
    if (updated && updated.tableId && updateData.status) {
      const tables = await this.db.getAll<any>('tables');
      const tIndex = tables.findIndex(t => t.id === updated.tableId || t.number.toString() === updated.tableId);
      if (tIndex !== -1) {
        if (updateData.status === 'LISTO') {
          tables[tIndex].status = 'PEDIDO_LISTO';
        } else if (updateData.status === 'PAGADO') {
          tables[tIndex].status = 'DISPONIBLE';
          tables[tIndex].currentOrderId = undefined;
          tables[tIndex].timeOccupied = undefined;
        } else if (updateData.status === 'ENTREGADO' || updateData.status === 'EN_COCINA' || updateData.status === 'EN_PREPARACION') {
          tables[tIndex].status = 'OCUPADA';
        }
        await this.db.setAll('tables', tables);
      }
    }
    return updated;
  }
}
