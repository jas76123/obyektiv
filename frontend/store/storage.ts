const PREFIX = 'obyektiv:';
const memory = new Map<string, string>();

/** localStorage может отсутствовать или бросать (приватное окно, node): тогда значения живут в памяти до перезагрузки. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key) ?? memory.get(key) ?? null;
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    const raw = memory.get(key);
    return raw === undefined ? fallback : (JSON.parse(raw) as T);
  }
}

export function save(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    globalThis.localStorage?.setItem(PREFIX + key, raw);
  } catch {
    /* остаётся в памяти */
  }
}
