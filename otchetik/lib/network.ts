/**
 * Сигнал отмены запроса через `ms` миллисекунд.
 * Не полагаемся на статический `AbortSignal.timeout` — его нет в полифилле
 * AbortController/AbortSignal, который React Native подставляет на Hermes
 * (node_modules/react-native/Libraries/Core/setUpXHR.js → пакет `abort-controller`).
 */
export function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const unref = (timer as unknown as { unref?: () => void }).unref;
  if (typeof unref === 'function') unref.call(timer);
  return controller.signal;
}

/** Отправка фото (POST) может идти долго — большой multipart на медленной сети. */
export const POST_TIMEOUT_MS = 20_000;
/** Чтение списков/статусов (GET) — короче, чтобы источник быстрее падал в кэш/демо. */
export const GET_TIMEOUT_MS = 8_000;
