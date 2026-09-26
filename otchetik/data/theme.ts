import { useColorScheme } from 'react-native';
import { resolveScheme, themes, type Theme } from '../lib/theme';
import { useSettings } from './settings';

/**
 * Текущий набор токенов. Настройка сильнее темы телефона; пока настройки не
 * загружены (первый рендер после холодного старта) — как «авто».
 * Возвращает константу модуля, поэтому годится в зависимости useMemo.
 */
export function useTheme(): Theme {
  const { settings } = useSettings();
  const system = useColorScheme(); // на вебе читает prefers-color-scheme
  return themes[resolveScheme(settings?.theme ?? 'auto', system)];
}
