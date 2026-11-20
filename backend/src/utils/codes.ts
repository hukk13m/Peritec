import { Counter } from '../models/index.js';

/** YYMMDD in local time (Vietnam) */
export function yymmdd(date = new Date()): string {
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * BR-05: generate RFQ-YYMMDD-NNN / BG-YYMMDD-NNN / PO-YYMMDD-NNN atomically.
 * Atomic $inc on a per-day key guarantees uniqueness under concurrency.
 */
export async function nextCode(prefix: 'RFQ' | 'BG' | 'PO', date = new Date()): Promise<string> {
  const day = yymmdd(date);
  const key = `${prefix}-${day}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${prefix}-${day}-${String(counter!.seq).padStart(3, '0')}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isExpired(validUntil?: Date | null): boolean {
  if (!validUntil) return true;
  const end = new Date(validUntil);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}
