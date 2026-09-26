import type { ServerShotStatus } from '../contract/schemas';

export type LocalStatus = 'queued' | 'uploading' | 'failed' | 'uploaded';
export type AnyShotStatus = ServerShotStatus | LocalStatus;

/**
 * Три слова на экранах (спека 25.09 §2). Вердикт руководителя не показываем:
 * «переснять» рождается из пустых детекций нейросети или из rework/rejected сервера.
 */
export type ScreenStatus = 'not_started' | 'in_work' | 'retake';

export const SCREEN_LABEL: Record<ScreenStatus, string> = {
  not_started: 'не начато',
  in_work: 'в работе',
  retake: 'переснять',
};

/** Цвета чипов; слово обязательно, цвет вторичен. */
export const SCREEN_COLOR: Record<ScreenStatus, string> = {
  not_started: '#7C8079',
  in_work: '#1B5C8A',
  retake: '#AC3529',
};

/** Сервер уже вынес итог (сам или руководитель): наше правило по детекциям больше не нужно. */
const FINAL: ReadonlySet<AnyShotStatus> = new Set(['accepted', 'partial', 'rework', 'rejected']);

/**
 * Статус одного фото. `mlEmpty` — нейросеть на этом фото ничего не нашла.
 * Правило «пусто → переснять» временное (спека 25.09 §3): оно действует, пока сервер
 * не поставил итоговый статус. С 26.09 сервер сам сравнивает фото с нарядом, и его
 * «принято» не должно перебиваться нашим «переснять».
 */
export function foldStatus(s: AnyShotStatus, opts?: { mlEmpty?: boolean }): ScreenStatus {
  if (FINAL.has(s)) return s === 'rework' || s === 'rejected' ? 'retake' : 'in_work';
  return opts?.mlEmpty ? 'retake' : 'in_work';
}

/** Статус работы = статус самого свежего фото. Список приходит новыми сверху. */
export function workStatus(newestFirst: ScreenStatus[]): ScreenStatus {
  return newestFirst[0] ?? 'not_started';
}

/**
 * Слово доставки у отдельного фото: строка «снято: N · …» на «Сегодня» и
 * раскрытая строка «Отчётов». Про работу говорит чип, про доставку — это слово.
 * `serverSet: false` — адрес сервера не задан, очередь ждёт не сети, а сервера.
 */
export function photoChip(s: AnyShotStatus, opts?: { serverSet?: boolean }): string {
  switch (s) {
    case 'queued':
    case 'draft':
    case 'failed':
      return opts?.serverSet === false ? 'ждёт сервера' : 'ждёт сети';
    case 'uploading':
      return 'отправляется';
    default:
      return 'отправлено';
  }
}
