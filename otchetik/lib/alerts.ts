import { Alert } from 'react-native';

/** Единый текст ошибки съёмки: серверную/системную фразу по-русски показываем как есть, иначе — общая формулировка. */
export function showCaptureError(e: unknown): void {
  const msg = (e as Error)?.message;
  Alert.alert('Не получилось', msg && /[а-яё]/i.test(msg) ? msg : 'Фото не сохранилось. Попробуйте ещё раз.');
}
