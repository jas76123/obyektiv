import * as SQLite from 'expo-sqlite';
import type { LocalStatus } from '../lib/status';
import { EMPTY_COUNTS, type QueueStore, type ShotRecord } from './types';

const COLS = 'local_uuid, task_id, work_name, zone, taken_at, geo, file_path, status, attempts, last_error, server_id, next_attempt_at, created_at, retake_of';

export class SqliteStore implements QueueStore {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('otchetik.db');
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS shots (
        local_uuid TEXT PRIMARY KEY, task_id TEXT NOT NULL, work_name TEXT NOT NULL, zone TEXT NOT NULL,
        taken_at TEXT NOT NULL, geo TEXT, file_path TEXT NOT NULL, status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, server_id TEXT,
        next_attempt_at INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, retake_of TEXT NULL
      );
      CREATE INDEX IF NOT EXISTS shots_status ON shots(status, created_at);
    `);
  }
  private d() { if (!this.db) throw new Error('SqliteStore: init() не вызван'); return this.db; }

  async add(r: ShotRecord) {
    await this.d().runAsync(
      `INSERT OR IGNORE INTO shots (${COLS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      r.local_uuid, r.task_id, r.work_name, r.zone, r.taken_at, r.geo, r.file_path, r.status,
      r.attempts, r.last_error, r.server_id, r.next_attempt_at, r.created_at, r.retake_of ?? null,
    );
  }
  async get(uuid: string) {
    return (await this.d().getFirstAsync<ShotRecord>(`SELECT ${COLS} FROM shots WHERE local_uuid = ?`, uuid)) ?? null;
  }
  async list(status: LocalStatus) {
    return this.d().getAllAsync<ShotRecord>(`SELECT ${COLS} FROM shots WHERE status = ? ORDER BY created_at`, status);
  }
  async listAll(sinceIso?: string) {
    return sinceIso
      ? this.d().getAllAsync<ShotRecord>(`SELECT ${COLS} FROM shots WHERE taken_at >= ? ORDER BY taken_at DESC`, sinceIso)
      : this.d().getAllAsync<ShotRecord>(`SELECT ${COLS} FROM shots ORDER BY taken_at DESC`);
  }
  async update(uuid: string, patch: Partial<ShotRecord>) {
    const keys = Object.keys(patch) as (keyof ShotRecord)[];
    if (keys.length === 0) return;
    const set = keys.map((k) => `${k} = ?`).join(', ');
    await this.d().runAsync(`UPDATE shots SET ${set} WHERE local_uuid = ?`, ...keys.map((k) => patch[k] as SQLite.SQLiteBindValue), uuid);
  }
  async remove(uuid: string) { await this.d().runAsync('DELETE FROM shots WHERE local_uuid = ?', uuid); }
  async countByStatus() {
    const rows = await this.d().getAllAsync<{ status: LocalStatus; n: number }>('SELECT status, COUNT(*) AS n FROM shots GROUP BY status');
    const c = { ...EMPTY_COUNTS };
    for (const r of rows) c[r.status] = r.n;
    return c;
  }
}
