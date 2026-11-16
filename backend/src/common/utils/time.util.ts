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
 * Calculates duration between two time strings (HH:mm) supporting overnight shifts.
 */
export function calculateMinutesBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [inH, inM] = startTime.split(':').map(Number);
  const [outH, outM] = endTime.split(':').map(Number);
  let diff = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
  if (diff < 0) {
    // Shift crossed midnight (e.g. 22:00 to 03:00 -> -1140 + 1440 = 300 min = 5 hrs)
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
