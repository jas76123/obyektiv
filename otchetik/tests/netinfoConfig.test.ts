import { beforeEach, describe, expect, it, vi } from 'vitest';

// NetInfo и react-native подменяем: тест проверяет, с чем вызывается NetInfo.configure на телефоне.
const configure = vi.fn();
vi.mock('@react-native-community/netinfo', () => ({ default: { configure } }));
const platform = { OS: 'android' };
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
}));

type Mod = typeof import('../queue/netinfoConfig');
type SettingsMod = typeof import('../data/settings');

async function fresh(): Promise<{ apply: Mod['applyNativeReachability']; settings: SettingsMod['DEFAULT_SETTINGS'] }> {
  // Модуль хранит «какой адрес уже настроен» — каждому тесту свой чистый экземпляр
  vi.resetModules();
  configure.mockClear();
  platform.OS = 'android';
  const m = await import('../queue/netinfoConfig');
  const s = await import('../data/settings');
  return { apply: m.applyNativeReachability, settings: s.DEFAULT_SETTINGS };
}

describe('applyNativeReachability', () => {
  beforeEach(() => { configure.mockClear(); });

  it('на телефоне проверяет интернет по серверу команды: GET, статус 200, свои таймауты, без системной проверки', async () => {
    const { apply, settings } = await fresh();
    apply(settings);
    expect(configure).toHaveBeenCalledTimes(1);
    const cfg = configure.mock.calls[0][0];
    expect(cfg.reachabilityUrl).toBe('http://217.18.63.89:8000/api/foreman/objects');
    expect(cfg.reachabilityMethod).toBe('GET');
    expect(cfg.useNativeReachability).toBe(false);
    expect(cfg.reachabilityRequestTimeout).toBe(25_000);
    expect(cfg.reachabilityShortTimeout).toBe(30_000);
    await expect(cfg.reachabilityTest({ status: 200 })).resolves.toBe(true);
    await expect(cfg.reachabilityTest({ status: 502 })).resolves.toBe(false);
  });

  it('свой адрес сервера из настроек, без завершающего слэша', async () => {
    const { apply, settings } = await fresh();
    apply({ ...settings, serverUrl: 'http://10.0.0.5:9000/' });
    expect(configure.mock.calls[0][0].reachabilityUrl).toBe('http://10.0.0.5:9000/api/foreman/objects');
  });

  it('повторный вызов с тем же адресом ничего не перенастраивает', async () => {
    const { apply, settings } = await fresh();
    apply(settings);
    apply({ ...settings, theme: 'dark' });
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it('«только демо» возвращает системную проверку, а обратно — снова по серверу', async () => {
    const { apply, settings } = await fresh();
    apply(settings);
    apply({ ...settings, demoOnly: true });
    expect(configure).toHaveBeenCalledTimes(2);
    expect(configure.mock.calls[1][0]).toEqual({ useNativeReachability: true });
    apply({ ...settings, demoOnly: false });
    expect(configure).toHaveBeenCalledTimes(3);
    expect(configure.mock.calls[2][0].useNativeReachability).toBe(false);
  });

  it('на вебе не трогает NetInfo (там своя настройка по каталогу сайта)', async () => {
    const { apply, settings } = await fresh();
    platform.OS = 'web';
    apply(settings);
    expect(configure).not.toHaveBeenCalled();
  });
});

describe('saveSettings и подписчики', () => {
  it('ошибка одного слушателя не мешает сохранению и остальным слушателям', async () => {
    vi.resetModules();
    platform.OS = 'android';
    const s = await import('../data/settings');
    const seen: string[] = [];
    s.onSettingsChange(() => { throw new Error('сломанный слушатель'); });
    s.onSettingsChange((n) => { seen.push(n.theme); });
    const next = await s.saveSettings({ theme: 'dark' });
    expect(next.theme).toBe('dark');
    expect(seen).toEqual(['dark']);
  });
});
