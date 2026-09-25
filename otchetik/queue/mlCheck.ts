import { PhotosResponse, type Photos } from '../contract/schemas';
import { fetchJson } from '../data/source';
import type { MlResultsStore } from '../lib/mlResults';
import { timeoutSignal } from '../lib/network';
import type { PhotosStore } from '../lib/photosCache';
import type { ShotRecord } from './types';

/**
 * Узнаём у сервера Георгия, нашла ли нейросеть что-то на фото прораба (спека 25.09 §3),
 * и тем же ответом наполняем кэш списка фото для рейтинга (спека 26.09 §5.2).
 * `GET /photos` отдаёт все файлы с детекциями; id записи = server_id нашего фото.
 * Маршрут гоняет детектор по всем файлам на каждый запрос, поэтому: один запрос на
 * прогон закрывает все ждущие фото, не чаще раза в минуту, с длинным таймаутом.
 */
export const ML_MIN_INTERVAL_MS = 60_000;
export const ML_TIMEOUT_MS = 90_000;
export const ML_LIMIT = 500;
/** Старше — не спрашиваем: сервер сменился, файлы стёрли, ушли за лимит /photos —
 * иначе такая запись дёргала бы тяжёлый маршрут вечно. */
export const ML_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

let lastRequestAt = -Infinity;
let inFlight = false;
/** Только для тестов. */
export function resetMlCheckClock(): void { lastRequestAt = -Infinity; inFlight = false; }

export type MlCheckResult = { checked: number; skipped: 'nothing' | 'too_soon' | 'in_flight' | 'error' | null };

/** «Ждущие» записи: загружены, есть server_id, результата ещё нет, и не старше ML_MAX_AGE_MS. */
export function waitingRecords(records: ShotRecord[], results: MlResultsStore, now: number): Array<ShotRecord & { server_id: string }> {
  const hasServerId = (r: ShotRecord): r is ShotRecord & { server_id: string } => !!r.server_id;
  return records.filter(hasServerId).filter((r) =>
    r.status === 'uploaded' && !results.get(r.local_uuid) && now - Date.parse(r.taken_at) <= ML_MAX_AGE_MS,
  );
}

export async function checkMlResults(deps: {
  base: string;
  records: ShotRecord[];
  results: MlResultsStore;
  /** Кэш списка фото для рейтинга; наполняется тем же ответом. */
  photos?: PhotosStore;
  /** Экран рейтинга открыт: запрос нужен, даже если своих ждущих фото нет. */
  wantPhotos?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): Promise<MlCheckResult> {
  const now = deps.now ?? Date.now;
  await deps.results.load();
  const waiting = waitingRecords(deps.records, deps.results, now());
  if (waiting.length === 0 && !deps.wantPhotos) return { checked: 0, skipped: 'nothing' };
  if (inFlight) return { checked: 0, skipped: 'in_flight' };
  if (now() - lastRequestAt < ML_MIN_INTERVAL_MS) return { checked: 0, skipped: 'too_soon' };
  inFlight = true;
  lastRequestAt = now();

  let photos: Photos['photos'];
  try {
    try {
      photos = (await fetchJson(`${deps.base}/photos?limit=${ML_LIMIT}&offset=0`, PhotosResponse, { signal: timeoutSignal(ML_TIMEOUT_MS) }, deps.fetchImpl ?? fetch)).photos;
    } catch {
      return { checked: 0, skipped: 'error' };
    }
    const checkedAt = new Date(now()).toISOString();

    if (deps.photos) {
      await deps.photos.set(photos.map((p) => ({ id: p.id, file: p.file, timestamp: p.timestamp, count: p.detections.length })), checkedAt);
    }

    const byId = new Map(photos.map((p) => [p.id, p]));
    let checked = 0;
    for (const r of waiting) {
      const item = byId.get(r.server_id);
      if (!item) continue; // ещё не в списке — спросим при следующем прогоне
      await deps.results.set(r.local_uuid, { empty: item.detections.length === 0, count: item.detections.length, checked_at: checkedAt });
      checked++;
    }
    return { checked, skipped: null };
  } finally {
    inFlight = false;
  }
}
