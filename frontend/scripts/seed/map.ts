import type { Status } from '@/contract';

/** Как бэкенд сейчас называет «закрыто без подтверждения». Если БА уберёт статус (DEV_REQUIREMENTS §8 п.1), заменить на 'nothing_detected'. */
export const MISMATCH_STATUS: Status = 'false_completion';

/** Старые коды макета 0.4 → словарь репозитория БА. */
export function mapStatus(old: string): Status {
  switch (old) {
    case 'confirmed':
    case 'late':
    case 'in_progress':
      return 'in_progress';
    case 'reported_mismatch':
      return MISMATCH_STATUS;
    case 'not_confirmed':
      return 'nothing_detected';
    case 'resources_only':
    case 'insufficient':
    case 'not_checked':
    case 'not_started':
      return old;
    default:
      throw new Error(`Неизвестный статус в данных макета: ${old}`);
  }
}
