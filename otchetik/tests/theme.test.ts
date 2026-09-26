import { describe, expect, it } from 'vitest';
import { LIGHT_FROM_HOUR, LIGHT_UNTIL_HOUR, THEME_PREF_LABEL, nextThemePref, resolveScheme, themes, type Theme } from '../lib/theme';

const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;

/** Плоский вид: status.* рядом с остальными ключами, чтобы сравнивать наборы. */
function flat(t: Theme): Record<string, string | number> {
  const { status, ...rest } = t;
  return { ...rest, ...Object.fromEntries(Object.entries(status).map(([k, v]) => [`status.${k}`, v])) };
}

describe('themes', () => {
  it('у светлой и тёмной одинаковый набор ключей', () => {
    expect(Object.keys(flat(themes.light)).sort()).toEqual(Object.keys(flat(themes.dark)).sort());
  });
  it('scheme совпадает с ключом', () => {
    expect(themes.light.scheme).toBe('light');
    expect(themes.dark.scheme).toBe('dark');
  });
  it('все цвета — #RRGGBB или #RRGGBBAA', () => {
    for (const t of [themes.light, themes.dark]) {
      for (const [k, v] of Object.entries(flat(t))) {
        if (k === 'scheme') continue;
        if (typeof v === 'string') expect(v, `${t.scheme}.${k}`).toMatch(HEX);
      }
    }
  });
  it('чипы статусов ссылаются на токены темы', () => {
    for (const t of [themes.light, themes.dark]) {
      expect(t.status.not_started).toBe(t.muted);
      expect(t.status.in_work).toBe(t.accentText);
      expect(t.status.retake).toBe(t.error);
    }
  });
  it('текст не сливается с фоном', () => {
    for (const t of [themes.light, themes.dark]) {
      expect(t.btn).not.toBe(t.btnInk);
      expect(t.ink).not.toBe(t.bg);
      expect(t.ink).not.toBe(t.paper);
    }
  });
  it('размеры одинаковые в обеих темах', () => {
    expect([themes.light.radius, themes.light.radiusLg, themes.light.pad]).toEqual([12, 16, 16]);
    expect([themes.dark.radius, themes.dark.radiusLg, themes.dark.pad]).toEqual([12, 16, 16]);
  });
});

describe('resolveScheme', () => {
  it('дневные часы 07:00–19:00', () => {
    expect([LIGHT_FROM_HOUR, LIGHT_UNTIL_HOUR]).toEqual([7, 19]);
  });
  it.each([
    ['auto', 7, 'light'],
    ['auto', 12, 'light'],
    ['auto', 18, 'light'],
    ['auto', 19, 'dark'],
    ['auto', 23, 'dark'],
    ['auto', 0, 'dark'],
    ['auto', 6, 'dark'],
    ['light', 23, 'light'],
    ['light', 12, 'light'],
    ['dark', 12, 'dark'],
    ['dark', 23, 'dark'],
  ] as const)('pref=%s hour=%s → %s', (pref, hour, want) => {
    expect(resolveScheme(pref, hour)).toBe(want);
  });
});

describe('переключение кнопкой в шапке', () => {
  it('по кругу: авто → светлая → тёмная → авто', () => {
    expect(nextThemePref('auto')).toBe('light');
    expect(nextThemePref('light')).toBe('dark');
    expect(nextThemePref('dark')).toBe('auto');
  });
  it('подписи', () => {
    expect(THEME_PREF_LABEL).toEqual({ auto: 'авто', light: 'светлая', dark: 'тёмная' });
  });
});
