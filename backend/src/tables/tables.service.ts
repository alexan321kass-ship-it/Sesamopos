import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class TablesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.getAll<any>('tables');
  }

  async assignWaiter(id: string, waiterId?: string, waiterName?: string) {
    const tables = await this.db.getAll<any>('tables');
    const index = tables.findIndex(t => t.id === id || String(t.number) === String(id));
    if (index !== -1) {
      tables[index].currentWaiterId = waiterId;
      tables[index].currentWaiterName = waiterName;
      await this.db.setAll('tables', tables);
      return tables[index];
    }
    return null;
  }

  async updateStatus(id: string, status: string) {
    const tables = await this.db.getAll<any>('tables');
    const index = tables.findIndex(t => t.id === id || String(t.number) === String(id));
    if (index !== -1) {
      tables[index].status = status;
      if (status === 'DISPONIBLE') {
        tables[index].currentOrderId = undefined;
        tables[index].timeOccupied = undefined;
      }
      await this.db.setAll('tables', tables);
      return tables[index];
    }
    return null;
  }

  async create(data: any) {
    const num = Number(data.number);
    const tables = await this.db.getAll<any>('tables');
    const existing = tables.find(t => Number(t.number) === num);
    if (existing) {
      throw new BadRequestException(`Ya existe una mesa con el número ${num}`);
    }

    const newTable = {
      id: data.id ? String(data.id) : String(Date.now()),
      number: num,
      capacity: Number(data.capacity) || 4,
      location: data.location || 'Salón Principal',
      status: data.status || 'DISPONIBLE',
      currentWaiterId: data.currentWaiterId || null,
      currentWaiterName: data.currentWaiterName || null,
      currentOrderId: null,
      timeOccupied: null,
    };

    return this.db.addOne('tables', newTable);
  }

  async update(id: string, data: any) {
    return this.db.updateOne('tables', id, (table: any) => ({
      ...table,
      ...data,
      number: data.number !== undefined ? Number(data.number) : table.number,
      capacity: data.capacity !== undefined ? Number(data.capacity) : table.capacity,
      location: data.location !== undefined ? data.location : table.location,
    }));
  }

  async delete(id: string) {
    return this.db.deleteOne('tables', id);
  }
}

