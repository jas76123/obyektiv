import { describe, expect, it } from 'vitest';
import { reachabilityPath, serverReachabilityUrl } from '../lib/reachability';

describe('reachabilityPath', () => {
  it('turns the page path into its directory so HEAD returns 200 under a prefix', () => {
    expect(reachabilityPath('/obyektiv/')).toBe('/obyektiv/');
    expect(reachabilityPath('/obyektiv/index.html')).toBe('/obyektiv/');
    expect(reachabilityPath('/obyektiv/settings')).toBe('/obyektiv/');
    expect(reachabilityPath('/obyektiv')).toBe('/obyektiv/');
  });
  it('falls back to the root when there is no prefix', () => {
    expect(reachabilityPath('/')).toBe('/');
    expect(reachabilityPath('/index.html')).toBe('/');
    expect(reachabilityPath('')).toBe('/');
  });
});

describe('serverReachabilityUrl', () => {
  it('проверка сети на телефоне — по серверу команды, дешёвым списком объектов', () => {
    expect(serverReachabilityUrl('http://217.18.63.89:8000')).toBe('http://217.18.63.89:8000/api/foreman/objects');
    expect(serverReachabilityUrl('http://217.18.63.89:8000/')).toBe('http://217.18.63.89:8000/api/foreman/objects');
  });
  it('без сервера (только демо) проверять нечего', () => {
    expect(serverReachabilityUrl(null)).toBeNull();
    expect(serverReachabilityUrl('')).toBeNull();
  });
});
