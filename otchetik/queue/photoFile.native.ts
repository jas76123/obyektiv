import { Directory, File, Paths } from 'expo-file-system';
import { JPEG_QUALITY, MAX_SIDE, compressToJpeg } from './compress';
import type { ShotRecord } from './types';

export { JPEG_QUALITY, MAX_SIDE };

function shotsDir(): Directory {
  const dir = new Directory(Paths.document, 'shots');
  if (!dir.exists) dir.create();
  return dir;
}

/** Сжать и положить в папку приложения. Возвращает file:// uri. */
export async function savePhoto(sourceUri: string, uuid: string, width?: number, height?: number): Promise<{ file_path: string }> {
  const { uri } = await compressToJpeg(sourceUri, width, height);
  const dest = new File(shotsDir(), `${uuid}.jpg`);
  if (dest.exists) dest.delete();
  // copy() стал асинхронным в этой версии expo-file-system; copySync — прямой
  // синхронный эквивалент кода из брифа.
  new File(uri).copySync(dest);
  return { file_path: dest.uri };
}

export async function photoUri(r: ShotRecord): Promise<string> {
  return r.file_path;
}
