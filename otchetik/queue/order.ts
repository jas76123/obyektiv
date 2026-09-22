import type { LocalStatus } from '../lib/status';
import type { ShotRecord } from './types';

/** Фильтрует по статусу и сортирует по created_at (возрастание). */
export function orderForSending(records: ShotRecord[], status: LocalStatus): ShotRecord[] {
  return records.filter((r) => r.status === status).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Фильтрует по taken_at >= since и сортирует по taken_at (убывание). */
export function orderNewestFirst(records: ShotRecord[], since?: string): ShotRecord[] {
  return records.filter((r) => !since || r.taken_at >= since).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
}
