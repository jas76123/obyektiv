import type { Alert, PortfolioSummary, Tone } from '@/contract';
import type { OutcomeCode } from '@/contract/labels';

export type HandlingView = { state: 'new' | 'seen' | 'contacted' | 'closed'; outcome?: OutcomeCode | null };
type HandlingOf = (a: Alert) => HandlingView;

/** Открытое замечание: претензия к ходу работ, которую ещё не закрыли исходом. */
export function isOpen(a: Alert, h: HandlingView): boolean {
  return a.kind === 'claim' && h.state !== 'closed';
}

/** Пять чисел строки сводки (DEV_REQUIREMENTS §4, экран 1). Единственный счёт во фронте: зависит от состояний в браузере. */
export function summarize(alerts: Alert[], handlingOf: HandlingOf): PortfolioSummary {
  const open = alerts.filter((a) => isOpen(a, handlingOf(a)));
  const setup = alerts.filter((a) => a.kind === 'setup' && handlingOf(a).state !== 'closed');
  const sharp = [...open].sort((x, y) => y.severity - x.severity)[0];
  return {
    open_alerts: open.length,
    objects_with_alerts: new Set(open.map((a) => a.object_id)).size,
    untouched_alerts: open.filter((a) => handlingOf(a).state === 'new').length,
    setup_tasks: setup.length,
    sharpest: sharp ? { alert_id: sharp.id, text: `${sharp.work_name} · ${sharp.object_short}` } : null,
  };
}

/** Бейдж «N замечаний» на карточке объекта: цвет по самому острому открытому. */
export function badgeOf(objectId: string, alerts: Alert[], handlingOf: HandlingOf): { count: number; tone: Tone | null } {
  const open = alerts.filter((a) => a.object_id === objectId && isOpen(a, handlingOf(a)));
  const sharp = [...open].sort((x, y) => y.severity - x.severity)[0];
  return { count: open.length, tone: sharp ? sharp.tone : null };
}
