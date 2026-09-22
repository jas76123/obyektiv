import { Alert, Platform } from 'react-native';

/** Показать алерт пользователю: на вебе используем browser alert, на мобильном — Alert из react-native. */
export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

/** Единый текст ошибки съёмки: серверную/системную фразу по-русски показываем как есть, иначе — общая формулировка. */
export function showCaptureError(e: unknown): void {
  const msg = (e as Error)?.message;
  showAlert('Не получилось', msg && /[а-яё]/i.test(msg) ? msg : 'Фото не сохранилось. Попробуйте ещё раз.');
}
