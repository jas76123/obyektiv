import type { Alert } from '@/contract';
import type { HandlingView } from '@/store/summary';

export type SortKey = 'sev' | 'obj' | 'stale' | 'contr' | 'gap';
export interface FeedState { objectId: string | null; sort: SortKey; onlyNew: boolean; onlyBad: boolean; showClosed: boolean }
type HandlingOf = (a: Alert) => HandlingView;

/** Разрыв «заявлено − подтверждено» в п.п.; без наблюдения замечание уходит в конец сортировки. */
export function gapOf(a: Alert): number {
  return a.triad.confirmed === null ? -999 : a.triad.declared.percent - a.triad.confirmed;
}

const claims = (alerts: Alert[], objectId: string | null) =>
  alerts.filter((a) => a.kind === 'claim' && (objectId ? a.object_id === objectId : true));

const CMP: Record<SortKey, (x: Alert, y: Alert) => number> = {
  sev: (x, y) => y.severity - x.severity,
  obj: (x, y) => x.object_short.localeCompare(y.object_short, 'ru') || y.severity - x.severity,
  stale: (x, y) => y.untouched_days - x.untouched_days || y.severity - x.severity,
  contr: (x, y) => x.contractor.localeCompare(y.contractor, 'ru') || y.severity - x.severity,
  gap: (x, y) => gapOf(y) - gapOf(x) || y.severity - x.severity,
};

export function feedList(alerts: Alert[], handlingOf: HandlingOf, s: FeedState): Alert[] {
  let list = claims(alerts, s.objectId);
  if (!s.showClosed) list = list.filter((a) => handlingOf(a).state !== 'closed');
  if (s.onlyNew) list = list.filter((a) => handlingOf(a).state === 'new');
  if (s.onlyBad) list = list.filter((a) => a.tone === 'bad');
  return [...list].sort(CMP[s.sort]);
}

export function feedCounts(alerts: Alert[], handlingOf: HandlingOf, objectId: string | null) {
  const base = claims(alerts, objectId);
  const open = base.filter((a) => handlingOf(a).state !== 'closed');
  return {
    base: base.length,
    onlyNew: open.filter((a) => handlingOf(a).state === 'new').length,
    onlyBad: open.filter((a) => a.tone === 'bad').length,
    closed: base.length - open.length,
  };
}

export function setupList(alerts: Alert[], objectId: string | null): Alert[] {
  return alerts.filter((a) => a.kind === 'setup' && (objectId ? a.object_id === objectId : true));
}
