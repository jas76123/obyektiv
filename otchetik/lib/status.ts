import type { ServerShotStatus } from '../contract/schemas';

export type LocalStatus = 'queued' | 'uploading' | 'failed' | 'uploaded';
export type AnyShotStatus = ServerShotStatus | LocalStatus;

/**
 * Вердикт сверки фото с планом (спека 26.09 «work_status» §2.1). Сервер команды отдаёт в
 * GET /photos `works_status[0].status`: confirmed (нашлась ожидаемая техника), not_confirmed
 * (детекции есть, но не те), review (детекций нет), unsure (работа не нашлась в таблице).
 * «Принято» — слово фото (событие), а не работы за день (процесс): решение продакта 26.09.
 */
export type PhotoVerdict = 'accepted' | 'retake' | null;
export const VERDICT_WORD: Record<Exclude<PhotoVerdict, null>, string> = { accepted: 'принято', retake: 'переснять' };
/** Окончательные значения сверки: по ним /photos больше не перезапрашивается (queue/mlCheck). */
export const FINAL_WORK_STATUS: ReadonlySet<string> = new Set(['confirmed', 'not_confirmed', 'review']);

/** «not confirmed» (письмо ML-инженера) и «not_confirmed» (его код) — одно значение; пусто → null. */
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
 */
export function foldStatus(s: AnyShotStatus, opts?: { verdict?: PhotoVerdict }): TodayStatus {
  if (FINAL.has(s)) return s === 'rework' || s === 'rejected' ? 'retake' : 'in_work';
  return opts?.verdict === 'retake' ? 'retake' : 'in_work';
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

const DELIVERED = 'отправлено';

/** Почему фото не отправилось — по тексту `last_error` записи очереди (queue/uploader.ts). */
export type FailReason = 'server_down' | 'server_rejected' | 'file_lost' | 'unknown';

/** Слова причины на экранах (решение продакта 26.09: коротко, без «повторим»). */
export const FAIL_WORD: Record<FailReason, string> = {
  server_down: 'сервер не отвечает',
  server_rejected: 'сервер отклонил фото',
  file_lost: 'файл потерян, переснимите',
  unknown: 'ошибка отправки',
};

/**
 * Класс причины по тексту ошибки. Тексты — из нашего кода (`HTTP <код>`, «ответ сервера не по
 * схеме», «файл фото не найден») и из платформы (expo/fetch: «The operation was aborted.» при
 * таймауте, «Network request failed», браузер: «Failed to fetch», expo-file-system: «does not exist»).
 * Файл проверяется раньше сетевых слов: «файл фото не найден» тоже содержит «не найден».
 */
export function failReason(lastError: string | null | undefined): FailReason | null {
  const e = (lastError ?? '').trim();
  if (!e) return null;
  const m = /HTTP (\d)\d\d/.exec(e);
  if (m) return m[1] === '4' ? 'server_rejected' : 'server_down';
  if (/не по схеме/i.test(e)) return 'server_rejected';
  if (/файл|file|exist|ENOENT/i.test(e)) return 'file_lost';
  if (/abort|network request failed|failed to fetch|timed? ?out/i.test(e)) return 'server_down';
  return 'unknown';
}

export type DeliveryOpts = {
  /** Адрес сервера задан; `false` — очередь ждёт не сети, а сервера. */
  serverSet?: boolean;
  /** Текст последней ошибки отправки (`ShotRecord.last_error`): у `failed` даёт слово причины. */
  lastError?: string | null;
  /** Есть ли сеть по NetInfo; `false` — причина устарела, снова «ждёт сети». */
  online?: boolean;
};

/**
 * Слово доставки у отдельного фото. `failed` с известной причиной при сети и заданном сервере —
 * слово причины (FAIL_WORD), иначе «ждёт сети»; фото, которое ещё не пробовали отправить, — «ждёт сети».
 */
export function photoChip(s: AnyShotStatus, opts?: DeliveryOpts): string {
  switch (s) {
    case 'failed': {
      const reason = opts?.serverSet !== false && opts?.online !== false ? failReason(opts?.lastError) : null;
      if (reason) return FAIL_WORD[reason];
      return opts?.serverSet === false ? 'ждёт сервера' : 'ждёт сети';
    }
    case 'queued':
    case 'draft':
      return opts?.serverSet === false ? 'ждёт сервера' : 'ждёт сети';
    case 'uploading':
      return 'отправляется';
    default:
      return DELIVERED;
  }
}

/**
 * Слово фото на экранах: строка «снято: N · …» на «Сегодня» и раскрытая строка «Отчётов».
 * Пока фото не доехало — слово доставки (или причины); доехало — вердикт сверки, а без него «отправлено».
 */
export function photoWord(s: AnyShotStatus, verdict: PhotoVerdict, opts?: DeliveryOpts): string {
  const delivery = photoChip(s, opts);
  return delivery === DELIVERED && verdict ? VERDICT_WORD[verdict] : delivery;
}
