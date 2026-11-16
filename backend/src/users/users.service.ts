import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword, comparePassword } from '../common/utils/hash.util.js';
import {
  getColombiaDateStr,
  getColombiaTimeStr,
  calculateShiftDurationHours,
  calculateMinutesBetween,
} from '../common/utils/time.util.js';

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
    const timeStr = getColombiaTimeStr();
    const dateStr = getColombiaDateStr();
    const user = await this.updateUser(id, {
      shiftStatus: 'EN_TURNO',
      shiftStartTime: timeStr,
    });
    if (user) {
      await this.addShift({
        id: 'sh-' + Date.now(),
        staffId: user.id,
        staffName: user.name,
        role: user.role,
        date: dateStr,
        checkIn: timeStr,
        status: 'ACTIVO',
        hoursWorked: 0,
        effectiveHoursWorked: 0,
        breaks: [],
        totalBreakMinutes: 0,
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
    const timeStr = getColombiaTimeStr();
    const dateStr = getColombiaDateStr();
    const user = await this.updateUser(id, {
      shiftStatus: 'FUERA_DE_TURNO',
      shiftStartTime: null,
    });
    const shifts = await this.getShifts();
    const active = shifts.find(s => String(s.staffId) === String(id) && (s.status === 'ACTIVO' || s.status === 'DESCANSO'));
    let hoursWorked = 0;
    let totalBreak = 0;
    if (active) {
      const breaks = Array.isArray(active.breaks) ? [...active.breaks] : [];
      if (breaks.length > 0) {
        const openBreak = breaks.find((b: any) => !b.endTime);
        if (openBreak) {
          openBreak.endTime = timeStr;
          const bMins = calculateMinutesBetween(openBreak.startTime, timeStr);
          openBreak.durationMinutes = Math.max(1, bMins);
          active.totalBreakMinutes = (active.totalBreakMinutes || 0) + openBreak.durationMinutes;
        }
      }
      totalBreak = active.totalBreakMinutes || 0;
      const { totalHours, effectiveHours } = calculateShiftDurationHours(
        active.checkIn || '08:00',
        timeStr,
        totalBreak
      );
      hoursWorked = totalHours;

      const currentNotes = active.notes || '';
      const finalNotes = currentNotes ? `${currentNotes} · [Turno finalizado a las ${timeStr}]` : `Turno finalizado a las ${timeStr}`;
      await this.db.updateOne<any>('shifts', active.id, (s: any) => ({
        ...s,
        checkOut: timeStr,
        status: 'COMPLETADO',
        hoursWorked,
        effectiveHoursWorked: effectiveHours,
        breaks,
        totalBreakMinutes: totalBreak,
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
        description: `Finalizó su turno a las ${timeStr} (${hoursWorked} hrs brutas, ${totalBreak} min en descanso)`,
      });
    }

    return user;
  }

  async setBreak(id: string) {
    const user = await this.findById(id);
    if (!user) return null;
    const timeStr = getColombiaTimeStr();
    const dateStr = getColombiaDateStr();
    const newStatus = user.shiftStatus === 'DESCANSO' ? 'EN_TURNO' : 'DESCANSO';

    const shifts = await this.getShifts();
    const active = shifts.find(s => String(s.staffId) === String(id) && (s.status === 'ACTIVO' || s.status === 'DESCANSO'));
    if (active) {
      const breaks = Array.isArray(active.breaks) ? [...active.breaks] : [];
      let totalBreak = active.totalBreakMinutes || 0;

      if (newStatus === 'DESCANSO') {
        breaks.push({
          id: 'brk-' + Date.now(),
          startTime: timeStr,
        });
      } else {
        const openBreak = breaks.find((b: any) => !b.endTime);
        if (openBreak) {
          openBreak.endTime = timeStr;
          const bMins = calculateMinutesBetween(openBreak.startTime, timeStr);
          openBreak.durationMinutes = Math.max(1, bMins);
          totalBreak += openBreak.durationMinutes;
        }
      }

      const actionText = newStatus === 'DESCANSO'
        ? `[Pausa iniciada a las ${timeStr}]`
        : `[Pausa finalizada a las ${timeStr}]`;
      const currentNotes = active.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes} · ${actionText}` : actionText;

      await this.db.updateOne<any>('shifts', active.id, (s: any) => ({
        ...s,
        status: newStatus === 'DESCANSO' ? 'DESCANSO' : 'ACTIVO',
        breaks,
        totalBreakMinutes: totalBreak,
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
