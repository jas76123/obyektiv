import type { ScreenStatus } from './status';

export type Scheme = 'light' | 'dark';
/** Настройка в скрытом экране: «авто» = как в телефоне или браузере. */
export type ThemePref = 'auto' | Scheme;

/**
 * Токены одной темы. Значения — из CSS дашборда Татьяны (спека 26.09 §2),
 * чтобы приложение и дашборд выглядели одним продуктом.
 */
export type Theme = {
  scheme: Scheme;
  bg: string;          // фон экранов
  paper: string;       // карточки, шапка, панель вкладок, поля
  surface2: string;    // заглушка миниатюры
  line: string;        // рамки карточек, разделители
  lineStrong: string;  // рамка поля ввода, невыбранного сегмента
  ink: string;         // основной текст
  muted: string;       // второстепенный текст
  faint: string;       // капсовые подписи разделов, заголовки колонок, плейсхолдер
  accent: string;      // рамка выбранного, «моя» строка, дорожка Switch
  accentText: string;  // текст-акцент, активная вкладка, спиннер обновления
  btn: string;         // фон основной кнопки
  btnInk: string;      // текст на основной кнопке
  ok: string;          // зарезервирован под «принято»
  okText: string;      // зарезервирован под «принято»
  warn: string;        // зарезервирован
  warnInk: string;     // текст бейджей «демо», «из кэша», предупреждения об очереди
  warnBg: string;      // их фон (жёлтый с прозрачностью 15 %)
  error: string;       // текст ошибок
  status: Record<ScreenStatus, string>; // цвета чипов: слово обязательно, цвет вторичен
  radius: number;      // кнопки, поля, сегменты (rounded-xl)
  radiusLg: number;    // карточки (rounded-2xl)
  pad: number;         // отступ экрана
};

const sizes = { radius: 12, radiusLg: 16, pad: 16 };

const dark: Theme = {
  scheme: 'dark',
  bg: '#0B1120',
  paper: '#111827',
  surface2: '#1E293B',
  line: '#1E293B',
  lineStrong: '#334155',
  ink: '#E2E8F0',
  muted: '#94A3B8',
  faint: '#64748B',
  accent: '#0EA5E9',
  accentText: '#38BDF8',
  btn: '#0EA5E9',
  btnInk: '#0B1120',
  ok: '#10B981',
  okText: '#34D399',
  warn: '#FBBF24',
  warnInk: '#FBBF24',
  warnBg: '#FBBF2426',
  error: '#EF4444',
  status: { not_started: '#94A3B8', in_work: '#38BDF8', retake: '#EF4444' },
  ...sizes,
};

const light: Theme = {
  scheme: 'light',
  bg: '#F0F5FC',
  paper: '#FFFFFF',
  surface2: '#E8EFF9',
  line: '#CDD8EB',
  lineStrong: '#B0BFDA',
  ink: '#0B1226',
  muted: '#263252',
  faint: '#4A5A7A',
  accent: '#0EA5E9',
  accentText: '#0369A1',
  btn: '#0369A1',
  btnInk: '#FFFFFF',
  ok: '#10B981',
  okText: '#047857',
  warn: '#FBBF24',
  warnInk: '#B45309',
  warnBg: '#FBBF2426',
  error: '#B91C1C',
  status: { not_started: '#263252', in_work: '#0369A1', retake: '#B91C1C' },
  ...sizes,
};

export const themes: Record<Scheme, Theme> = { light, dark };

/** «Авто»: светлая с LIGHT_FROM_HOUR до LIGHT_UNTIL_HOUR по времени телефона, иначе тёмная (решение продакта 26.09). */
export const LIGHT_FROM_HOUR = 7;
export const LIGHT_UNTIL_HOUR = 19;

/** Настройка сильнее времени; в «авто» светлая только в часы [LIGHT_FROM_HOUR, LIGHT_UNTIL_HOUR). `hour` — 0–23. */
export function resolveScheme(pref: ThemePref, hour: number): Scheme {
  if (pref !== 'auto') return pref;
  return hour >= LIGHT_FROM_HOUR && hour < LIGHT_UNTIL_HOUR ? 'light' : 'dark';
}

/** Порядок переключения кнопкой в шапке: авто → светлая → тёмная → авто. */
const THEME_PREF_ORDER: readonly ThemePref[] = ['auto', 'light', 'dark'];

/** Подпись на кнопке в шапке. */
export const THEME_PREF_LABEL: Record<ThemePref, string> = { auto: 'авто', light: 'светлая', dark: 'тёмная' };

export function nextThemePref(pref: ThemePref): ThemePref {
  const i = THEME_PREF_ORDER.indexOf(pref);
  return THEME_PREF_ORDER[(i + 1) % THEME_PREF_ORDER.length];
}
