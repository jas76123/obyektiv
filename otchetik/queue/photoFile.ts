// Нейтральная заглушка только для tsc и Vitest (там нет ни файловой системы
// устройства, ни IndexedDB браузера). Metro на устройстве и в вебе всегда
// подставляет photoFile.native.ts / photoFile.web.ts вместо этого файла.
// Сигнатура обязана совпадать с ними — tsc типизирует вызовы через этот файл.
import type { ShotRecord } from './types';

export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.6;

export async function savePhoto(sourceUri: string, _uuid: string, _width?: number, _height?: number): Promise<{ file_path: string }> {
  return { file_path: sourceUri };
}

export async function photoUri(r: ShotRecord): Promise<string> {
  return r.file_path;
}
