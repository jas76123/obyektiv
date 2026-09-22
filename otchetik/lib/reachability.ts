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
