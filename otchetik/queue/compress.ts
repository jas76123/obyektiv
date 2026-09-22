import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.6;

/**
 * Общий пайплайн сжатия для native и web: не длиннее MAX_SIDE по большей
 * стороне, JPEG с фиксированным качеством. Возвращает uri сжатого файла
 * (native: file://, web: временный blob-uri из ImageManipulator).
 */
export async function compressToJpeg(sourceUri: string, width?: number, height?: number): Promise<{ uri: string }> {
  const landscape = (width ?? 0) >= (height ?? 0);
  const rendered = await ImageManipulator.manipulate(sourceUri)
    .resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE })
    .renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri };
}
