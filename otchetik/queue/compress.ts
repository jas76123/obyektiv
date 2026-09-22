import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { MAX_SIDE, JPEG_QUALITY, resizeSpec } from '../lib/resize';

export { MAX_SIDE, JPEG_QUALITY } from '../lib/resize';

/**
 * Общий пайплайн сжатия для native и web: не длиннее MAX_SIDE по большей
 * стороне, JPEG с фиксированным качеством. Возвращает uri сжатого файла
 * (native: file://, web: временный blob-uri из ImageManipulator).
 */
export async function compressToJpeg(sourceUri: string, width?: number, height?: number): Promise<{ uri: string }> {
  const spec = resizeSpec(width, height);
  const rendered = await ImageManipulator.manipulate(sourceUri)
    .resize(spec)
    .renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri };
}
