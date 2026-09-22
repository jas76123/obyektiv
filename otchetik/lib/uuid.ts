/** UUID v4 из 16 случайных байт (RFC 4122): версия 4, вариант 10xx. */
export function uuidFromBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error('UUID requires exactly 16 bytes');
  }

  // Копируем, чтобы не мутировать входную переменную
  const b = new Uint8Array(bytes);

  // Устанавливаем версию 4: биты 12-15 в byte[6] = 0100
  b[6] = (b[6] & 0x0f) | 0x40;

  // Устанавливаем вариант 10: биты 6-7 в byte[8] = 10
  b[8] = (b[8] & 0x3f) | 0x80;

  // Форматируем как 8-4-4-4-12 hex
  const hex = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** crypto.randomUUID есть только в защищённом контексте (HTTPS/localhost); иначе собираем uuid из случайных байт. */
export function newUuid(
  randomBytes: (n: number) => Uint8Array,
  cryptoObj?: { randomUUID?: () => string },
): string {
  const crypto = cryptoObj ?? globalThis.crypto;
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return uuidFromBytes(randomBytes(16));
}
