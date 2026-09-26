import { useEffect, useState } from 'react';
import { resolveScheme, themes, type Theme } from '../lib/theme';
import { useSettings } from './settings';

/** Час по времени телефона; перечитывается раз в минуту, чтобы «авто» само переключилось в 07:00 и 19:00. */
function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);
  return hour;
}

/**
 * Текущий набор токенов. Настройка сильнее времени суток; пока настройки не
 * загружены (первый рендер после холодного старта) — как «авто».
 * Возвращает константу модуля, поэтому годится в зависимости useMemo.
 */
export function useTheme(): Theme {
  const { settings } = useSettings();
  const hour = useHour();
  return themes[resolveScheme(settings?.theme ?? 'auto', hour)];
}
