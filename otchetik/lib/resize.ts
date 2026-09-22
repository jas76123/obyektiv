export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.6;

/** Какую сторону ограничивать, чтобы длинная стала MAX_SIDE. Без размеров считаем альбомной. */
export function resizeSpec(width?: number, height?: number): { width: number } | { height: number } {
  const landscape = (width ?? 0) >= (height ?? 0);
  return landscape ? { width: MAX_SIDE } : { height: MAX_SIDE };
}
