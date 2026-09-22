import type { ServerShotStatus } from '../contract/schemas';

export type LocalStatus = 'queued' | 'uploading' | 'failed' | 'uploaded';
export type AnyShotStatus = ServerShotStatus | LocalStatus;

export type ScreenStatus =
  | 'not_started' | 'in_work' | 'on_review' | 'accepted' | 'partial' | 'rework' | 'rejected';

export const SCREEN_LABEL: Record<ScreenStatus, string> = {
  not_started: 'не начато',
  in_work: 'в работе',
  on_review: 'на проверке',
  accepted: 'принято',
  partial: 'частично',
  rework: 'на доработку',
  rejected: 'отклонено',
};

/** Цвета чипов; слово обязательно, цвет вторичен. */
export const SCREEN_COLOR: Record<ScreenStatus, string> = {
  not_started: '#7C8079',
  in_work: '#1B5C8A',
  on_review: '#A06712',
  accepted: '#2E7A4E',
  partial: '#2E7A4E',
  rework: '#AC3529',
  rejected: '#AC3529',
};

export function foldStatus(s: AnyShotStatus): ScreenStatus {
  switch (s) {
    case 'draft':
    case 'queued':
    case 'uploading':
    case 'failed':
      return 'in_work';
    case 'uploaded':
    case 'processing':
    case 'processed':
    case 'under_review':
      return 'on_review';
    case 'accepted':
      return 'accepted';
    case 'partial':
      return 'partial';
    case 'rework':
      return 'rework';
    case 'rejected':
      return 'rejected';
  }
}

/** Порядок из спеки §2.3: прорабу важнее увидеть, что от него ждут действия. */
const PRIORITY: ScreenStatus[] = ['rework', 'rejected', 'in_work', 'on_review', 'partial', 'accepted'];

export function workStatus(statuses: ScreenStatus[]): ScreenStatus {
  if (statuses.length === 0) return 'not_started';
  for (const p of PRIORITY) if (statuses.includes(p)) return p;
  return 'not_started';
}

/** Слово у отдельного фото на «Сегодня» и в раскрытой строке «Отчётов». */
export function photoChip(s: AnyShotStatus): string {
  switch (s) {
    case 'queued':
    case 'draft':
      return 'ждёт сети';
    case 'uploading':
      return 'отправляется';
    case 'failed':
      return 'ждёт сети';
    case 'uploaded':
      return 'отправлено';
    default:
      return SCREEN_LABEL[foldStatus(s)];
  }
}
