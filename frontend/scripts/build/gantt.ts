import type { GanttWork, ObjectGantt } from '@/contract';
import { fmt, plural, workdays, isoOf, toN } from '@/lib/format';
import { AS_OF, obj, statusOf, workTags, cameraState } from './context';
import { objectCard, delayDays, workCounts } from './portfolio';

function forecastText(objectId: string): string {
  const o = obj(objectId);
  if (o.cams === 0) return '';
  let worst: { name: string; pe: string; fcast: string; days: number } | null = null;
  for (const id of o.order) {
    const w = o.works[id]!;
    if (!w.fcast) continue;
    const days = workdays(isoOf(toN(w.pe) + 1), w.fcast);
    if (!worst || days > worst.days) worst = { name: w.name, pe: w.pe, fcast: w.fcast, days };
  }
  const unconfirmed = o.order
    .filter((id) => ['false_completion', 'nothing_detected'].includes(statusOf(o.works[id]!).status))
    .map((id) => o.works[id]!.name.toLowerCase());
  if (!worst && !unconfirmed.length) return 'Сроки. Прогноз по наблюдаемому темпу совпадает с графиком, сдвигов нет.';
  let text = 'Прогноз сроков.';
  if (worst) text += ` Худшая работа «${worst.name}»: по темпу наблюдения окончание ${fmt(worst.fcast)} вместо ${fmt(worst.pe)}, это +${worst.days} раб. ${plural(worst.days, ['день', 'дня', 'дней'])} к сроку следующего этапа.`;
  if (unconfirmed.length) text += ` Объём по ${unconfirmed.join(', ')} закрыт в графике, но не подтверждён наблюдением: прогноз по нему невозможен до проверки.`;
  return text;
}

export function buildGantt(objectId: string): ObjectGantt {
  const o = obj(objectId);
  const works: GanttWork[] = o.order.map((id) => {
    const w = o.works[id]!;
    const st = statusOf(w);
    return {
      id,
      name: w.name,
      zone: w.zone,
      contractor: w.contr,
      plan_start: w.ps,
      plan_end: w.pe,
      plan_v1: w.plan0 ? { start: w.plan0[0], end: w.plan0[1] } : null,
      declared: { percent: w.fact },
      status: st.status,
      status_reason: st.reason,
      tags: workTags(w),
      fact: w.fs && w.fe && w.fc ? { start: w.fs, end: w.fe, tone: w.fc.replace('f-', '') as 'ok' | 'warn' | 'bad' | 'done' } : null,
      forecast_end: w.fcast ?? null,
    };
  });
  return {
    as_of: AS_OF,
    object: { ...objectCard(objectId), zones_label: o.zonelbl },
    cameras: o.camlist.map((c) => cameraState(objectId, c[0])),
    counts: workCounts(o),
    forecast: { text: forecastText(objectId), delay_days: delayDays(o) },
    acts: (o.acts ?? []).map(([date, reason]) => ({ date, reason })),
    works,
  };
}
