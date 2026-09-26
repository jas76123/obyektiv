import type { ServerShotStatus } from '../contract/schemas';

export type LocalStatus = 'queued' | 'uploading' | 'failed' | 'uploaded';
export type AnyShotStatus = ServerShotStatus | LocalStatus;

/**
 * Вердикт сверки фото с планом (спека 26.09 «work_status» §2.1). Сервер Георгия отдаёт в
 * GET /photos `works_status[0].status`: confirmed (нашлась ожидаемая техника), not_confirmed
 * (детекции есть, но не те), review (детекций нет), unsure (работа не нашлась в таблице).
 * «Принято» — слово фото (событие), а не работы за день (процесс): решение продакта 26.09.
 */
export type PhotoVerdict = 'accepted' | 'retake' | null;
export const VERDICT_WORD: Record<Exclude<PhotoVerdict, null>, string> = { accepted: 'принято', retake: 'переснять' };
/** Окончательные значения сверки: по ним /photos больше не перезапрашивается (queue/mlCheck). */
export const FINAL_WORK_STATUS: ReadonlySet<string> = new Set(['confirmed', 'not_confirmed', 'review']);

/** «not confirmed» (письмо Георгия) и «not_confirmed» (его код) — одно значение; пусто → null. */
export function normalizeWorkStatus(s: string | null | undefined): string | null {
  const v = (s ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  return v || null;
}

/** Что известно о фото от нейросети: сверка и «ничего не нашла» (lib/mlResults.MlResult). */
export type MlInfo = { work_status?: string | null; empty?: boolean };

/**
 * Вердикт фото. Сверка главнее детекций. При `unsure`, неизвестном слове или без сверки
 * действует старое правило «детекций нет → переснять» (спека 25.09 §3): сервер на шлюзе пока
 * всем ставит `unsure`, и сегодняшнее поведение не должно пропасть.
 */
export function photoVerdict(ml?: MlInfo): PhotoVerdict {
  const ws = normalizeWorkStatus(ml?.work_status);
  if (ws === 'confirmed') return 'accepted';
  if (ws === 'review' || ws === 'not_confirmed') return 'retake';
  return ml?.empty ? 'retake' : null;
}

/**
 * Слова чипа работы. Сегодня — три слова (спека 25.09 §2): «переснять» рождается из вердикта
 * фото или из rework/rejected сервера. За прошедший день система ставит итог сама (спека
 * 26.09 «work_status» §2.4): «принято» / «не принято».
 */
export type ScreenStatus = 'not_started' | 'in_work' | 'retake' | 'accepted' | 'not_accepted';
/** Статус одного фото за сегодня: без «не начато» и без итогов дня. */
export type TodayStatus = 'in_work' | 'retake';

export const SCREEN_LABEL: Record<ScreenStatus, string> = {
  not_started: 'не начато',
  in_work: 'в работе',
  retake: 'переснять',
  accepted: 'принято',
  not_accepted: 'не принято',
};

/** Сервер уже вынес итог (сам или руководитель): вердикт сверки больше не нужен. */
const FINAL: ReadonlySet<AnyShotStatus> = new Set(['accepted', 'partial', 'rework', 'rejected']);

/**
 * Статус одного фото за сегодня. Итог сервера главнее вердикта сверки. «Принято» у фото не
 * делает работу принятой: день ещё идёт.
 * `mlEmpty` — псевдоним старого правила по детекциям, живёт до перевода lib/reports на
 * вердикты (задача 5 плана); новый код передаёт `verdict`.
 */
export function foldStatus(s: AnyShotStatus, opts?: { verdict?: PhotoVerdict; mlEmpty?: boolean }): TodayStatus {
  if (FINAL.has(s)) return s === 'rework' || s === 'rejected' ? 'retake' : 'in_work';
  const verdict = opts?.verdict ?? (opts?.mlEmpty ? 'retake' : null);
  return verdict === 'retake' ? 'retake' : 'in_work';
}

/** Статус работы за сегодня = статус самого свежего фото. Список приходит новыми сверху. */
export function workStatus(newestFirst: ScreenStatus[]): ScreenStatus {
  return newestFirst[0] ?? 'not_started';
}

/**
 * Итог работы за прошедший день: «принято», если есть хотя бы одно фото не «переснять»
 * (`unsure` не наказывает прораба — решение продакта 26.09); «не принято», если фото нет
 * или все «переснять».
 */
export function dayVerdict(folded: TodayStatus[]): 'accepted' | 'not_accepted' {
  return folded.some((f) => f !== 'retake') ? 'accepted' : 'not_accepted';
}

/**
 * Слово доставки у отдельного фото. `serverSet: false` — адрес сервера не задан, очередь
 * ждёт не сети, а сервера.
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

const DELIVERED = 'отправлено';

/**
 * Слово фото на экранах: строка «снято: N · …» на «Сегодня» и раскрытая строка «Отчётов».
 * Пока фото не доехало — слово доставки; доехало — вердикт сверки, а без него «отправлено».
 */
export function photoWord(s: AnyShotStatus, verdict: PhotoVerdict, opts?: { serverSet?: boolean }): string {
  const delivery = photoChip(s, opts);
  return delivery === DELIVERED && verdict ? VERDICT_WORD[verdict] : delivery;
}
