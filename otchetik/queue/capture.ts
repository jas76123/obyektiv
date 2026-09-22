import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { ScheduleTask } from '../contract/schemas';
import { newUuid } from '../lib/uuid';
import { savePhoto } from './photoFile';
import { queueEvents } from './queueEvents';
import { getStore, storeReady } from './store';
import { newRecord, type ShotRecord } from './types';

export { queueEvents };

/** Координаты, если телефон отдал их за секунду; иначе null. Никогда не блокирует съёмку. */
async function quickGeo(): Promise<string | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) {
      const asked = await Location.requestForegroundPermissionsAsync();
      if (!asked.granted) return null;
    }
    const pos = await Promise.race([
      Location.getLastKnownPositionAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]);
    return pos ? `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}` : null;
  } catch {
    return null;
  }
}

/** Тап «Фото»: системная камера → сжатие → файл → запись queued. Возвращает запись или null, если прораб отменил.
 * `opts.retakeOf` — local_uuid прежнего фото, которое переснимается (экран «Отчёты», кнопка «Переснять»). */
export async function captureForTask(task: ScheduleTask, opts?: { retakeOf?: string }): Promise<ShotRecord | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Нет доступа к камере');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: false });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const uuid = newUuid((n) => Crypto.getRandomValues(new Uint8Array(n)));
  const taken_at = new Date().toISOString();
  const { file_path } = await savePhoto(asset.uri, uuid, asset.width, asset.height);
  const geo = await quickGeo();
  await storeReady();
  const record = newRecord({ local_uuid: uuid, task_id: task.task_id, work_name: task.name, zone: task.zone, taken_at, geo, file_path, retake_of: opts?.retakeOf ?? null });
  await getStore().add(record);
  queueEvents.emit();
  return record;
}
