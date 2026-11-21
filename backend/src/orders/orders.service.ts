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

    // Auto-descargue de inventario en backend para productos y recetas
    if (Array.isArray(newOrder.items) && newOrder.items.length > 0) {
      await this.deductInventoryForOrder(newOrder.items);
    }

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

  private async deductInventoryForOrder(items: any[]): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) return;
    try {
      const inventory = await this.db.getAll<any>('inventory');
      if (!Array.isArray(inventory) || inventory.length === 0) return;

      for (const item of items) {
        const itemQty = Number(item.quantity) || 1;
        const pName = (item.productName || item.name || '').toLowerCase().trim();
        const pId = String(item.productId || item.id || '');

        const invItem = inventory.find(inv =>
          String(inv.id) === pId ||
          (inv.name && inv.name.toLowerCase().trim() === pName) ||
          (inv.code && item.sku && inv.code.toLowerCase() === item.sku.toLowerCase()) ||
          (pName && inv.name && pName.includes(inv.name.toLowerCase().trim())) ||
          (pName && inv.name && inv.name.toLowerCase().trim().includes(pName))
        );

        if (invItem) {
          const newStock = Math.max(0, parseFloat(((Number(invItem.currentStock) || 0) - itemQty).toFixed(3)));
          await this.db.updateOne('inventory', String(invItem.id), (curr: any) => ({
            ...curr,
            currentStock: newStock,
          }));
        }
      }
    } catch (err) {
      // Non-blocking log
    }
  }

  async updateStatus(id: string, status: string) {
    const updated = await this.db.updateOne<any>('orders', id, item => ({ ...item, status }));

    if (updated && updated.tableId) {
      const tables = await this.db.getAll<any>('tables');
      const tIndex = tables.findIndex(t => t.id === updated.tableId || t.number.toString() === updated.tableId);
      if (tIndex !== -1) {
        if (status === 'LISTO') {
          tables[tIndex].status = 'PEDIDO_LISTO';
        } else if (status === 'PAGADO' || status === 'ENTREGADO' || status === 'EN_COCINA' || status === 'EN_PREPARACION' || status === 'CREADO') {
          tables[tIndex].status = 'OCUPADA';
        }
        await this.db.setAll('tables', tables);
      }
    }

    return updated;
  }

  async update(id: string, updateData: any) {
    const updated = await this.db.updateOne<any>('orders', id, item => {
      const isPaid = updateData.status === 'PAGADO';
      const paidAt = isPaid ? (updateData.paidAt || item.paidAt || Date.now()) : (updateData.paidAt !== undefined ? updateData.paidAt : item.paidAt);
      return {
        ...item,
        ...updateData,
        paidAt,
        updatedAt: Date.now(),
      };
    });
    if (updated && updated.tableId && updateData.status) {
      const tables = await this.db.getAll<any>('tables');
      const tIndex = tables.findIndex(t => t.id === updated.tableId || t.number.toString() === updated.tableId);
      if (tIndex !== -1) {
        if (updateData.status === 'LISTO') {
          tables[tIndex].status = 'PEDIDO_LISTO';
        } else if (updateData.status === 'PAGADO' || updateData.status === 'ENTREGADO' || updateData.status === 'EN_COCINA' || updateData.status === 'EN_PREPARACION') {
          tables[tIndex].status = 'OCUPADA';
        }
        await this.db.setAll('tables', tables);
      }
    }
    return updated;
  }
}
