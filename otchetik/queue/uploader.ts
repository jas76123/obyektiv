import type { QueueStore, ShotRecord } from './types';

export const RETRY_DELAYS_MS = [5000, 15000, 45000];
export const RETRY_AFTER_MS = 120000;

export function nextDelay(attempts: number): number {
  return RETRY_DELAYS_MS[attempts - 1] ?? RETRY_AFTER_MS;
}

export type RunResult = { sent: number; failed: number; skipped: boolean };
export type UploadFn = (r: ShotRecord) => Promise<{ server_id: string }>;

let running = false;

/**
 * Один прогон очереди. Замок: второй одновременный вызов возвращает skipped. Записи,
 * оставшиеся в uploading после обрыва, отправляются заново. `force` игнорирует
 * `next_attempt_at` у failed-записей — нужно, когда сеть только что появилась и
 * записи ещё не «дозрели» до своего времени повтора (спека §4.4).
 */
export async function runQueue(deps: { store: QueueStore; upload: UploadFn; now?: () => number; onProgress?: () => void; force?: boolean }): Promise<RunResult> {
  if (running) return { sent: 0, failed: 0, skipped: true };
  running = true;
  const now = deps.now ?? Date.now;
  const result: RunResult = { sent: 0, failed: 0, skipped: false };
  try {
    const due = [
      ...(await deps.store.list('uploading')),
      ...(await deps.store.list('queued')),
      ...(await deps.store.list('failed')).filter((r) => deps.force || r.next_attempt_at <= now())
    ].sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const r of due) {
      await deps.store.update(r.local_uuid, { status: 'uploading' });
      deps.onProgress?.();
      try {
        const { server_id } = await deps.upload(r);
        await deps.store.update(r.local_uuid, { status: 'uploaded', server_id, last_error: null });
        result.sent++;
      } catch (e) {
        const attempts = r.attempts + 1;
        await deps.store.update(r.local_uuid, {
          status: 'failed', attempts, last_error: e instanceof Error ? e.message : String(e),
          next_attempt_at: now() + nextDelay(attempts),
        });
        result.failed++;
      }
      deps.onProgress?.();
    }
  } finally {
    running = false;
  }
  return result;
}
