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

/** Отправка фото (POST): большой multipart на медленной сети, плюс сервер Георгия однопоточный —
 * пока считает чужой /photos (10–20 с, замер 25.09), не отвечает никому. */
export const POST_TIMEOUT_MS = 45_000;
/** Чтение списков/статусов (GET): тоже с запасом на занятый сервер, иначе шапка мигает «сервер не отвечает». */
export const GET_TIMEOUT_MS = 25_000;
