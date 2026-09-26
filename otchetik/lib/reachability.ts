/**
 * Адрес, по которому NetInfo на вебе проверяет «есть ли интернет».
 * Стандартно он шлёт `HEAD /` и ждёт 200, но приложение живёт под префиксом
 * (`/obyektiv/`), а корень сайта отдаёт 404 и на ноутбуке, и на GitHub Pages.
 * Тогда NetInfo считает сеть недоступной, шапка показывает «нет сети», а прогон
 * очереди отменяется. Берём первый сегмент пути как каталог: он отдаёт index.html.
 */
export function reachabilityPath(pathOrBase: string): string {
  const first = pathOrBase.split('/').filter(Boolean)[0];
  if (!first || first.endsWith('.html')) return '/';
  return `/${first}/`;
}

/**
 * Адрес, по которому NetInfo на телефоне проверяет «есть ли интернет». Стандартно он
 * доверяет системе Android, а та проверяет сеть по серверам Google: если до Google не
 * достучаться (эмулятор без DNS, ограничения сети в России), шапка показывает «нет сети»
 * и очередь не запускается, хотя сервер команды доступен. Поэтому проверяем по самому
 * серверу команды дешёвым запросом. `null` — сервера нет («только демо»): проверять нечего.
 */
export function serverReachabilityUrl(base: string | null): string | null {
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/api/foreman/objects`;
}
