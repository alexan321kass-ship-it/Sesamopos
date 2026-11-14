import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword, comparePassword } from '../common/utils/hash.util.js';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.getAll<any>('users');
  }

  async findById(id: string) {
    const users = await this.findAll();
    return users.find(u => String(u.id) === String(id)) || null;
  }

  async findByEmail(email: string) {
    const users = await this.db.getAll<any>('users');
    return users.find(u => u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim());
  }

  async addUser(user: any) {
    return this.db.addOne('users', user);
  }

  async updateUser(id: string, updates: any) {
    return this.db.updateOne<any>('users', id, u => ({ ...u, ...updates }));
  }

  async deleteUser(id: string) {
    return this.db.deleteOne('users', id);
  }

  async updatePassword(id: string, newHashedPassword: string) {
    return this.db.updateOne<any>('users', id, u => ({ ...u, password: newHashedPassword }));
  }

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return comparePassword(plain, hashed);
  }

  async getShifts() {
    return this.db.getAll<any>('shifts');
  }

  async addShift(shift: any) {
    return this.db.addOne('shifts', shift);
  }

  async clockIn(id: string) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const user = await this.updateUser(id, {
      shiftStatus: 'EN_TURNO',
      shiftStartTime: timeStr,
    });
    if (user) {
      await this.addShift({
        staffId: user.id,
        staffName: user.name,
        role: user.role,
        date: now.toISOString().split('T')[0],
        checkIn: timeStr,
        status: 'ACTIVO',
        hoursWorked: 0,
        notes: `Turno iniciado a las ${timeStr}`,
      });
    }
    return user;
  }

  async clockOut(id: string) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const user = await this.updateUser(id, {
      shiftStatus: 'FUERA_DE_TURNO',
      shiftStartTime: null,
    });
    const shifts = await this.getShifts();
    const active = shifts.find(s => String(s.staffId) === String(id) && s.status === 'ACTIVO');
    if (active) {
      const [inH, inM] = (active.checkIn || '00:00').split(':').map(Number);
      const [outH, outM] = timeStr.split(':').map(Number);
      const totalMinutes = Math.max(15, (outH * 60 + outM) - (inH * 60 + inM));
      const hoursWorked = parseFloat((totalMinutes / 60).toFixed(2));
      await this.db.updateOne<any>('shifts', active.id, (s: any) => ({
        ...s,
        checkOut: timeStr,
        status: 'COMPLETADO',
        hoursWorked,
      }));
    }
    return user;
  }

  async setBreak(id: string) {
    const user = await this.findById(id);
    if (!user) return null;
    const newStatus = user.shiftStatus === 'DESCANSO' ? 'EN_TURNO' : 'DESCANSO';
    return this.updateUser(id, { shiftStatus: newStatus });
  }
}
