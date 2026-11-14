import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface CashRegister {
  id: string;
  name: string;
  openedBy: string;
  openedAt: number;
  initialAmount: number;
  currentAmount: number;
  isOpen: boolean;
}

export interface CashMovement {
  id: string;
  type: 'INGRESO' | 'GASTO';
  amount: number;
  reason: string;
  date: number;
}

export interface ClosedShiftReport {
  id: string;
  registerId: string;
  openedBy: string;
  openedAt: number;
  closedBy?: string;
  closedAt: number;
  initialAmount: number;
  countedCash: number;
  notes?: string;
  movements: CashMovement[];
}

@Injectable()
export class CashService {
  constructor(private readonly db: DatabaseService) {}

  async getCurrentRegister(): Promise<CashRegister | null> {
    const registers = await this.db.getAll<CashRegister>('cashRegisters');
    const active = registers.find(r => r.isOpen);
    return active || null;
  }

  async openRegister(initialAmount: number, openedBy: string): Promise<CashRegister> {
    const registers = await this.db.getAll<CashRegister>('cashRegisters');
    // Close any previous open registers just in case
    const updated = registers.map(r => ({ ...r, isOpen: false }));

    const newRegister: CashRegister = {
      id: Date.now().toString(),
      name: 'Caja Principal (POS)',
      openedBy: openedBy || 'Laura Gómez (Cajera)',
      openedAt: Date.now(),
      initialAmount: Number(initialAmount) || 0,
      currentAmount: Number(initialAmount) || 0,
      isOpen: true
    };

    updated.push(newRegister);
    await this.db.setAll('cashRegisters', updated);
    // Reset movements for new shift
    await this.db.setAll('cashMovements', []);
    return newRegister;
  }

  async addMovement(type: 'INGRESO' | 'GASTO', amount: number, reason: string): Promise<CashMovement> {
    const numericAmount = type === 'GASTO' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
    const newMovement: CashMovement = {
      id: Date.now().toString(),
      type,
      amount: numericAmount,
      reason,
      date: Date.now()
    };

    await this.db.addOne('cashMovements', newMovement);
    return newMovement;
  }

  async getMovements(): Promise<CashMovement[]> {
    return await this.db.getAll<CashMovement>('cashMovements');
  }

  async closeRegister(finalCash: number, notes?: string, closedBy?: string): Promise<ClosedShiftReport | null> {
    const registers = await this.db.getAll<CashRegister>('cashRegisters');
    const activeIndex = registers.findIndex(r => r.isOpen);

    if (activeIndex === -1) return null;

    const activeReg = registers[activeIndex];
    registers[activeIndex].isOpen = false;
    await this.db.setAll('cashRegisters', registers);

    const movements = await this.getMovements();

    const closedReport: ClosedShiftReport = {
      id: Date.now().toString(),
      registerId: activeReg.id,
      openedBy: activeReg.openedBy,
      openedAt: activeReg.openedAt,
      closedBy: closedBy || activeReg.openedBy,
      closedAt: Date.now(),
      initialAmount: activeReg.initialAmount,
      countedCash: Number(finalCash) || 0,
      notes: notes || '',
      movements
    };

    await this.db.addOne('cashHistory', closedReport);
    return closedReport;
  }

  async getHistory(): Promise<ClosedShiftReport[]> {
    return await this.db.getAll<ClosedShiftReport>('cashHistory');
  }
}
