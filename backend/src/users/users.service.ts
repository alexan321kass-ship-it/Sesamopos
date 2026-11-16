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

  private shiftLogs: any[] = [];

  async getShifts() {
    return this.db.getAll<any>('shifts');
  }

  async getShiftLogs() {
    return this.shiftLogs;
  }

  async addShiftLog(log: any) {
    this.shiftLogs.unshift(log);
    return log;
  }

  async addShift(shift: any) {
    return this.db.addOne('shifts', shift);
  }

  async clockIn(id: string) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    const user = await this.updateUser(id, {
      shiftStatus: 'EN_TURNO',
      shiftStartTime: timeStr,
    });
    if (user) {
      await this.addShift({
        staffId: user.id,
        staffName: user.name,
        role: user.role,
        date: dateStr,
        checkIn: timeStr,
        status: 'ACTIVO',
        hoursWorked: 0,
        notes: `Turno iniciado a las ${timeStr}`,
      });
      await this.addShiftLog({
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        date: dateStr,
        time: timeStr,
        staffId: user.id,
        staffName: user.name,
        role: user.role,
        eventType: 'INICIO_TURNO',
        description: `Inicio de turno registrado a las ${timeStr}`,
      });
    }
    return user;
  }

  async clockOut(id: string) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    const user = await this.updateUser(id, {
      shiftStatus: 'FUERA_DE_TURNO',
      shiftStartTime: null,
    });
    const shifts = await this.getShifts();
    const active = shifts.find(s => String(s.staffId) === String(id) && (s.status === 'ACTIVO' || s.status === 'DESCANSO'));
    let hoursWorked = 0;
    if (active) {
      const [inH, inM] = (active.checkIn || '00:00').split(':').map(Number);
      const [outH, outM] = timeStr.split(':').map(Number);
      const totalMinutes = Math.max(15, (outH * 60 + outM) - (inH * 60 + inM));
      hoursWorked = parseFloat((totalMinutes / 60).toFixed(2));
      const currentNotes = active.notes || '';
      const finalNotes = currentNotes ? `${currentNotes} · [Turno finalizado a las ${timeStr}]` : `Turno finalizado a las ${timeStr}`;
      await this.db.updateOne<any>('shifts', active.id, (s: any) => ({
        ...s,
        checkOut: timeStr,
        status: 'COMPLETADO',
        hoursWorked,
        notes: finalNotes,
      })).catch(() => {});
    }

    if (user) {
      await this.addShiftLog({
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        date: dateStr,
        time: timeStr,
        staffId: user.id,
        staffName: user.name,
        role: user.role,
        eventType: 'FIN_TURNO',
        description: `Finalizó su turno a las ${timeStr} (${hoursWorked} hrs laboradas)`,
      });
    }

    return user;
  }

  async setBreak(id: string) {
    const user = await this.findById(id);
    if (!user) return null;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    const newStatus = user.shiftStatus === 'DESCANSO' ? 'EN_TURNO' : 'DESCANSO';

    const shifts = await this.getShifts();
    const active = shifts.find(s => String(s.staffId) === String(id) && (s.status === 'ACTIVO' || s.status === 'DESCANSO'));
    if (active) {
      const actionText = newStatus === 'DESCANSO'
        ? `[Pausa iniciada a las ${timeStr}]`
        : `[Pausa finalizada a las ${timeStr}]`;
      const currentNotes = active.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes} · ${actionText}` : actionText;
      await this.db.updateOne<any>('shifts', active.id, (s: any) => ({
        ...s,
        status: newStatus === 'DESCANSO' ? 'DESCANSO' : 'ACTIVO',
        notes: updatedNotes,
      })).catch(() => {});
    }

    await this.addShiftLog({
      id: 'log-' + Date.now(),
      timestamp: Date.now(),
      date: dateStr,
      time: timeStr,
      staffId: user.id,
      staffName: user.name,
      role: user.role,
      eventType: newStatus === 'DESCANSO' ? 'PAUSA_INICIADA' : 'PAUSA_FINALIZADA',
      description: newStatus === 'DESCANSO'
        ? `Pausó su turno (salida a descanso/refrigerio) a las ${timeStr}`
        : `Reanudó su turno tras descanso a las ${timeStr}`,
    });

    return this.updateUser(id, { shiftStatus: newStatus });
  }
}
