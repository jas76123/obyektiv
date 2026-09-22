import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { queryClient } from '../data/queryClient';
import { loadSettings, serverBase } from '../data/settings';
import { listsChangedByRun } from '../lib/poll';
import { queueEvents } from './queueEvents';
import { getStore, storeReady } from './store';
import { uploadShot } from './uploadShot';
import { runQueue, type RunResult } from './uploader';

/** То же правило, что и в useOnline (app/(tabs)/today.tsx): есть соединение и оно не помечено как недоступное. */
function isOnline(s: NetInfoState): boolean {
  return !!s.isConnected && s.isInternetReachable !== false;
}

/**
 * Прогон с настоящими зависимостями. Без адреса сервера (demoOnly) ничего не шлёт.
 * Пока телефон офлайн, тоже не запускается: иначе 60-секундный тик копит attempts
 * и уводит failed-записи на 120-секундный шаг, хотя сети всё равно нет.
 * `force` (сеть только что появилась) игнорирует `next_attempt_at`, чтобы фото не
 * ждали до двух минут после возврата сети.
 */
export async function runQueueNow(opts?: { force?: boolean }): Promise<RunResult> {
  const base = serverBase(await loadSettings());
  if (!base) return { sent: 0, failed: 0, skipped: true };
  const net = await NetInfo.fetch();
  if (!isOnline(net)) return { sent: 0, failed: 0, skipped: true };
  await storeReady();
  const result = await runQueue({ store: getStore(), upload: (r) => uploadShot(base, r), onProgress: () => queueEvents.emit(), force: opts?.force });
  // Фото не ушло — сервер, видимо, пропал; ушло — вернулся. В обоих случаях
  // переспрашиваем наряды, объекты, рейтинг и статусы, чтобы шапка показала
  // (или сняла) строку проблемы сразу, а не после смены вкладки.
  if (listsChangedByRun(result)) queryClient.invalidateQueries().catch(() => {});
  return result;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedule(delayMs: number, opts?: { force?: boolean }) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; runQueueNow(opts).catch(() => {}); }, delayMs);
}

/** Есть ли вообще что слать — чтобы не будить отправщик на пустой очереди. */
async function hasPending(): Promise<boolean> {
  await storeReady();
  const c = await getStore().countByStatus();
  return c.queued + c.uploading + c.failed > 0;
}

/** Четыре триггера из спеки §4.4: после съёмки, сеть появилась, приложение на переднем плане, вручную (runQueueNow). */
export function installTriggers(): () => void {
  const offQueue = queueEvents.on(() => schedule(300));
  const offNet = NetInfo.addEventListener((s) => { if (isOnline(s)) schedule(500, { force: true }); });
  const sub = AppState.addEventListener('change', (st) => { if (st === 'active') schedule(500); });
  const tick = setInterval(() => { hasPending().then((yes) => { if (yes) schedule(0); }).catch(() => {}); }, 60_000); // подбирает failed, чьё время пришло
  schedule(1000);
  return () => { offQueue(); offNet(); sub.remove(); clearInterval(tick); if (timer) clearTimeout(timer); };
}
