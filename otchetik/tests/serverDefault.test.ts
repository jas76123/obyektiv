import { describe, expect, it } from 'vitest';
import { GATEWAY_HOST_SUFFIX, TEAM_SERVER_URL, defaultServerUrl, resolveServerBase } from '../lib/serverDefault';

describe('defaultServerUrl', () => {
  it('сборка на телефоне ходит на сервер команды напрямую', () => {
    expect(defaultServerUrl({ platform: 'android' })).toBe(TEAM_SERVER_URL);
    expect(defaultServerUrl({ platform: 'ios' })).toBe(TEAM_SERVER_URL);
  });
  it('веб на шлюзе Яндекса ходит на свой же адрес', () => {
    const hostname = 'd5abc' + GATEWAY_HOST_SUFFIX;
    expect(defaultServerUrl({ platform: 'web', hostname, origin: `https://${hostname}` })).toBe(`https://${hostname}`);
  });
  it('веб где-то ещё — умолчания нет (демо)', () => {
    expect(defaultServerUrl({ platform: 'web', hostname: 'jas76123.github.io', origin: 'https://jas76123.github.io' })).toBe('');
    expect(defaultServerUrl({ platform: 'web', hostname: '127.0.0.1', origin: 'http://127.0.0.1:4001' })).toBe('');
    expect(defaultServerUrl({ platform: 'web' })).toBe('');
  });
});

describe('resolveServerBase', () => {
  it('пустой адрес → умолчание, без завершающих слэшей', () => {
    expect(resolveServerBase({ serverUrl: '', demoOnly: false }, 'http://x:8000/')).toBe('http://x:8000');
    expect(resolveServerBase({ serverUrl: '   ', demoOnly: false }, 'http://x:8000')).toBe('http://x:8000');
  });
  it('пустой адрес без умолчания → null', () => {
    expect(resolveServerBase({ serverUrl: '', demoOnly: false }, '')).toBeNull();
  });
  it('введённый адрес перекрывает умолчание', () => {
    expect(resolveServerBase({ serverUrl: ' http://192.168.0.10:8000// ', demoOnly: false }, 'http://x')).toBe('http://192.168.0.10:8000');
  });
  it('«только демо» → null даже при умолчании', () => {
    expect(resolveServerBase({ serverUrl: 'http://x', demoOnly: true }, 'http://y')).toBeNull();
  });
});
