import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { loadSettings, serverBase } from '../data/settings';
import { queueEvents } from './queueEvents';
import { getStore, storeReady } from './store';
import { uploadShot } from './uploadShot';
import { runQueue, type RunResult } from './uploader';

/** Прогон с настоящими зависимостями. Без адреса сервера (demoOnly) ничего не шлёт. */
export async function runQueueNow(): Promise<RunResult> {
  const base = serverBase(await loadSettings());
  if (!base) return { sent: 0, failed: 0, skipped: true };
  await storeReady();
  return runQueue({ store: getStore(), upload: (r) => uploadShot(base, r), onProgress: () => queueEvents.emit() });
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedule(delayMs: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; runQueueNow().catch(() => {}); }, delayMs);
}

/** Четыре триггера из спеки §4.4: после съёмки, сеть появилась, приложение на переднем плане, вручную (runQueueNow). */
export function installTriggers(): () => void {
  const offQueue = queueEvents.on(() => schedule(300));
  const offNet = NetInfo.addEventListener((s) => { if (s.isConnected) schedule(500); });
  const sub = AppState.addEventListener('change', (st) => { if (st === 'active') schedule(500); });
  const tick = setInterval(() => schedule(0), 60_000); // подбирает failed, чьё время пришло
  schedule(1000);
  return () => { offQueue(); offNet(); sub.remove(); clearInterval(tick); if (timer) clearTimeout(timer); };
}
