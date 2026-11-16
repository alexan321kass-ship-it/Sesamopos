export const TIMEZONE_COLOMBIA = 'America/Bogota';

/**
 * Safely parses any date/timestamp input (number in ms or sec, ISO string, Date object)
 * into a valid millisecond timestamp.
 */
export function parseDateOrTimestamp(val: any): number {
  if (val === null || val === undefined) return Date.now();
  if (typeof val === 'number') {
    return val < 10000000000 ? val * 1000 : val;
  }
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return num < 10000000000 ? num * 1000 : num;
    }
    const parsed = new Date(val).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? Date.now() : t;
  }
  return Date.now();
}

/**
 * Returns YYYY-MM-DD in Colombia timezone (America/Bogota, UTC-5).
 * Prevents premature date changes after 7:00 PM local time.
 */
export function getColombiaDateStr(dateInput: any = Date.now()): string {
  const ts = parseDateOrTimestamp(dateInput);
  const d = new Date(ts);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns HH:mm in Colombia timezone (America/Bogota, UTC-5).
 */
export function getColombiaTimeStr(dateInput: any = Date.now()): string {
  const ts = parseDateOrTimestamp(dateInput);
  const d = new Date(ts);
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: TIMEZONE_COLOMBIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Returns the hour (0-23) in Colombia timezone.
 */
export function getColombiaHour(dateInput: any = Date.now()): number {
  const ts = parseDateOrTimestamp(dateInput);
  const d = new Date(ts);
  const str = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_COLOMBIA,
    hour: 'numeric',
    hour12: false,
  }).format(d);
  const h = parseInt(str, 10);
  return isNaN(h) ? 0 : (h === 24 ? 0 : h);
}

/**
 * Calculates duration in minutes between two time strings (HH:mm) supporting overnight shifts.
 */
export function calculateMinutesBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [inH, inM] = startTime.split(':').map(Number);
  const [outH, outM] = endTime.split(':').map(Number);
  let diff = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
  if (diff < 0) {
    // Crosses midnight (e.g. 22:00 to 02:00 -> -1200 + 1440 = 240 mins = 4 hrs)
    diff += 24 * 60;
  }
  return diff;
}

/**
 * Computes shift duration (gross hours, net effective hours minus breaks).
 */
export function calculateShiftDurationHours(
  checkIn: string,
  checkOut: string,
  totalBreakMinutes: number = 0
): { totalHours: number; effectiveHours: number; workedMinutes: number } {
  if (!checkIn || !checkOut) return { totalHours: 0, effectiveHours: 0, workedMinutes: 0 };
  const diffMinutes = calculateMinutesBetween(checkIn, checkOut);
  const totalHours = parseFloat((diffMinutes / 60).toFixed(2));
  const effectiveMinutes = Math.max(0, diffMinutes - (totalBreakMinutes || 0));
  const effectiveHours = parseFloat((effectiveMinutes / 60).toFixed(2));
  return { totalHours, effectiveHours, workedMinutes: effectiveMinutes };
}

/**
 * Computes live elapsed time for an active shift in progress.
 */
export function getLiveElapsedShiftHours(checkIn: string, totalBreakMinutes: number = 0): { hours: number; label: string } {
  if (!checkIn) return { hours: 0, label: '0.0 hrs' };
  const nowTime = getColombiaTimeStr();
  const { effectiveHours, workedMinutes } = calculateShiftDurationHours(checkIn, nowTime, totalBreakMinutes);
  const h = Math.floor(workedMinutes / 60);
  const m = workedMinutes % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m} min`;
  return { hours: effectiveHours, label };
}

/**
 * Formats minutes into human-readable duration, e.g. "2h 30m" or "45 min".
 */
export function formatMinutesFriendly(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}
