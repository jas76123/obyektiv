import { loadSettings, serverBase } from '../data/settings';
import { checkMlResults, type MlCheckResult } from './mlCheck';
import { mlResults } from './mlResults';
import { photosCache, photosWanted } from './photosCache';
import { getStore, storeReady } from './store';

/** Проверка с настоящими зависимостями. Без адреса сервера или при выключенной настройке — ничего. */
export async function runMlCheckNow(): Promise<MlCheckResult> {
  const s = await loadSettings();
  const base = serverBase(s);
  if (!base || !s.mlCheck) return { checked: 0, skipped: 'nothing' };
  await storeReady();
  const records = await getStore().list('uploaded');
  return checkMlResults({ base, records, results: mlResults, photos: photosCache, wantPhotos: photosWanted() });
}
