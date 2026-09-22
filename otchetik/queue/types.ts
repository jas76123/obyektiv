import type { LocalStatus } from '../lib/status';

export type ShotRecord = {
  local_uuid: string;
  task_id: string;
  work_name: string;
  zone: string;
  taken_at: string;            // ISO 8601
  geo: string | null;          // «lat,lon» или null
  file_path: string;           // native: file:// uri; web: ключ blob в IndexedDB (= local_uuid)
  status: LocalStatus;
  attempts: number;
  last_error: string | null;
  server_id: string | null;
  next_attempt_at: number;     // ms epoch; 0 = можно сразу
  created_at: string;          // ISO 8601
  /** local_uuid фото «на доработку», которое переснимает это фото; null/отсутствует иначе. */
  retake_of?: string | null;
};

export interface QueueStore {
  init(): Promise<void>;
  add(r: ShotRecord): Promise<void>;
  get(uuid: string): Promise<ShotRecord | null>;
  /** Записи с данным статусом, по created_at. */
  list(status: LocalStatus): Promise<ShotRecord[]>;
  /** Все записи не старше sinceIso (по taken_at), новые сверху. */
  listAll(sinceIso?: string): Promise<ShotRecord[]>;
  update(uuid: string, patch: Partial<ShotRecord>): Promise<void>;
  remove(uuid: string): Promise<void>;
  countByStatus(): Promise<Record<LocalStatus, number>>;
}

export const EMPTY_COUNTS: Record<LocalStatus, number> = { queued: 0, uploading: 0, failed: 0, uploaded: 0 };

export function newRecord(p: Pick<ShotRecord, 'local_uuid' | 'task_id' | 'work_name' | 'zone' | 'taken_at' | 'geo' | 'file_path'> & Partial<Pick<ShotRecord, 'retake_of'>>): ShotRecord {
  return { ...p, status: 'queued', attempts: 0, last_error: null, server_id: null, next_attempt_at: 0, created_at: new Date().toISOString(), retake_of: p.retake_of ?? null };
}
