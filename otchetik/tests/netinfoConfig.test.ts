import { beforeEach, describe, expect, it, vi } from 'vitest';

// Мок NetInfo повторяет главное побочное действие настоящей библиотеки: configure() сносит
// состояние вместе со всеми подписками (src/index.ts → tearDown), а addEventListener сразу
// отдаёт слушателю текущее состояние.
type Handler = (s: unknown) => void;
const subscribers = new Set<Handler>();
const netState = { isConnected: true, isInternetReachable: true };
const configure = vi.fn((_cfg: Record<string, unknown>) => { subscribers.clear(); });
const addEventListener = vi.fn((h: Handler) => { subscribers.add(h); h(netState); return () => { subscribers.delete(h); }; });
const refresh = vi.fn(async () => netState);
vi.mock('@react-native-community/netinfo', () => ({ default: { configure, addEventListener, refresh } }));
const platform = { OS: 'android' };
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
}));

type Mod = typeof import('../queue/netinfoConfig');
import type { Settings } from '../data/settings';
const SERVER = 'http://10.0.0.5:9000';

async function fresh(): Promise<{ m: Mod; settings: Settings }> {
  // Модуль хранит «какой адрес уже настроен» и список подписчиков — каждому тесту свой чистый экземпляр
  vi.resetModules();
  configure.mockClear(); addEventListener.mockClear(); refresh.mockClear(); subscribers.clear();
  platform.OS = 'android';
  const m = await import('../queue/netinfoConfig');
  const s = await import('../data/settings');
  return { m, settings: { ...s.DEFAULT_SETTINGS, serverUrl: SERVER } };
}

describe('applyNativeReachability', () => {
  beforeEach(() => { configure.mockClear(); });

  it('на телефоне проверяет интернет по серверу команды: GET, статус 200, свои таймауты, без системной проверки', async () => {
    const { m, settings } = await fresh();
    m.applyNativeReachability(settings);
    expect(configure).toHaveBeenCalledTimes(1);
    const cfg = configure.mock.calls[0][0];
    const test = cfg.reachabilityTest as (r: { status: number }) => Promise<boolean>;
    expect(cfg.reachabilityUrl).toBe(`${SERVER}/api/foreman/objects`);
    expect(cfg.reachabilityMethod).toBe('GET');
    expect(cfg.useNativeReachability).toBe(false);
    expect(cfg.reachabilityRequestTimeout).toBe(25_000);
    expect(cfg.reachabilityShortTimeout).toBe(m.REACHABILITY_RETRY_MS);
    expect(m.REACHABILITY_RETRY_MS).toBe(30_000);
    await expect(test({ status: 200 })).resolves.toBe(true);
    await expect(test({ status: 502 })).resolves.toBe(false);
  });

  it('адрес сервера без завершающего слэша', async () => {
    const { m, settings } = await fresh();
    m.applyNativeReachability({ ...settings, serverUrl: `${SERVER}/` });
    expect(configure.mock.calls[0][0].reachabilityUrl).toBe(`${SERVER}/api/foreman/objects`);
  });

  it('повторный вызов с тем же адресом ничего не перенастраивает', async () => {
    const { m, settings } = await fresh();
    m.applyNativeReachability(settings);
    m.applyNativeReachability({ ...settings, theme: 'dark' });
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it('«только демо» возвращает системную проверку, а обратно — снова по серверу', async () => {
    const { m, settings } = await fresh();
    m.applyNativeReachability(settings);
    m.applyNativeReachability({ ...settings, demoOnly: true });
    expect(configure).toHaveBeenCalledTimes(2);
    expect(configure.mock.calls[1][0]).toEqual({ useNativeReachability: true });
    m.applyNativeReachability({ ...settings, demoOnly: false });
    expect(configure).toHaveBeenCalledTimes(3);
    expect(configure.mock.calls[2][0].useNativeReachability).toBe(false);
  });

  it('на вебе не трогает NetInfo (там своя настройка по каталогу сайта)', async () => {
    const { m, settings } = await fresh();
    platform.OS = 'web';
    m.applyNativeReachability(settings);
    expect(configure).not.toHaveBeenCalled();
  });
});

describe('subscribeNet: подписка переживает NetInfo.configure()', () => {
  it('после перенастройки слушатель подписан заново и получает текущее состояние', async () => {
    const { m, settings } = await fresh();
    const seen: unknown[] = [];
    m.subscribeNet((s) => seen.push(s));
    expect(subscribers.size).toBe(1);
    expect(seen).toHaveLength(1); // как у NetInfo: текущее состояние сразу
    m.applyNativeReachability(settings); // configure() снёс подписки…
    expect(subscribers.size).toBe(1);    // …обёртка подписала заново
    expect(seen).toHaveLength(2);
    m.applyNativeReachability({ ...settings, demoOnly: true });
    expect(subscribers.size).toBe(1);
    expect(seen).toHaveLength(3);
  });

  it('отписавшийся слушатель после перенастройки не возвращается', async () => {
    const { m, settings } = await fresh();
    const a = vi.fn(); const b = vi.fn();
    const offA = m.subscribeNet(a);
    m.subscribeNet(b);
    offA();
    expect(subscribers.size).toBe(1);
    m.applyNativeReachability(settings);
    expect(subscribers.size).toBe(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('refreshNet зовёт NetInfo.refresh и глотает ошибку', async () => {
    const { m } = await fresh();
    refresh.mockRejectedValueOnce(new Error('нет сети'));
    expect(() => m.refreshNet()).not.toThrow();
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('saveSettings и подписчики', () => {
  it('ошибка одного слушателя не мешает сохранению и остальным слушателям', async () => {
    vi.resetModules();
    platform.OS = 'android';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = await import('../data/settings');
    const seen: string[] = [];
    s.onSettingsChange(() => { throw new Error('сломанный слушатель'); });
    s.onSettingsChange((n) => { seen.push(n.theme); });
    const next = await s.saveSettings({ theme: 'dark' });
    expect(next.theme).toBe('dark');
    expect(seen).toEqual(['dark']);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
