'use client';
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { ObjectGantt, GanttWork } from '@/contract';
import { REASON_LABEL } from '@/contract/labels';
import { toN, isoOf, fmt, plural } from '@/lib/format';
import { sixWeeks, wholeObject, barStyle, todayLeft, weekScale, inWindow, type GanttWindow } from './ganttGeometry';

type WinMode = 'six' | 'all';

function rowNote(w: GanttWork, resolved: Record<string, string>): string {
  const parts = [`${w.zone} · ${w.contractor}`];
  if (w.status_reason) parts.push(`не проверяется: ${REASON_LABEL[w.status_reason].toLowerCase()}`);
  if (w.status === 'insufficient') parts.push('недостаточно данных');
  if (w.forecast_end) parts.push(`прогноз до ${fmt(w.forecast_end)}`);
  if (w.plan_v1) parts.push('план сдвигался');
  if (resolved[w.id]) parts.push(`решено вручную: ${(resolved[w.id] ?? '').toLowerCase()}`);
  return parts.join(' · ');
}

function GanttRow({ w, win, asOf, resolved }: { w: GanttWork; win: GanttWindow; asOf: string; resolved: Record<string, string> }) {
  const p0 = w.plan_v1 ? barStyle(win, w.plan_v1.start, w.plan_v1.end) : null;
  const pl = barStyle(win, w.plan_start, w.plan_end);
  const fa = w.fact ? barStyle(win, w.fact.start, w.fact.end) : null;
  const fc = w.forecast_end ? barStyle(win, isoOf(toN(w.fact?.end ?? asOf) + 1), w.forecast_end) : null;
  const manual = resolved[w.id];
  const factClass = manual ? 'f-manual' : `f-${w.fact?.tone}`;
  return (
    <Link className="grow" href={`/work/?id=${encodeURIComponent(w.id)}`}>
      <span className="gname"><b>{w.name}</b><i>{rowNote(w, resolved)}</i></span>
      <span className="gtrack">
        {p0 ? <span className="bar plan0" style={p0} /> : null}
        {pl ? <span className="bar plan" style={pl} /> : null}
        {fa ? <span className={`bar fact ${factClass}`} style={fa} /> : null}
        {fc ? <span className="bar fcast" style={fc} /> : null}
        <span className="today" style={{ left: todayLeft(win, asOf) }}><b>сегодня</b></span>
      </span>
    </Link>
  );
}

/** Гант объекта (мокап 0.4, gantt(), строки 880–906). */
export function Gantt({ data, resolved }: { data: ObjectGantt; resolved: Record<string, string> }) {
  const [winMode, setWinMode] = useState<WinMode>('six');
  const gwin = winMode === 'six' || data.works.length === 0 ? sixWeeks(data.as_of) : wholeObject(data.works);
  const cols = Math.ceil(gwin.days / 7);
  const rows = data.works.filter((w) => inWindow(gwin, w));
  const outside = data.works.length - rows.length;
  const scale = weekScale(gwin);

  return (
    <div className="scroll-x">
      <div className="gantt" style={{ '--cols': cols } as CSSProperties}>
        <div className="ghead">
          <div className="glbl">
            <span className="seg">
              <button type="button" aria-pressed={winMode === 'six'} onClick={() => setWinMode('six')}>6 недель</button>
              <button type="button" aria-pressed={winMode === 'all'} onClick={() => setWinMode('all')} disabled={data.works.length === 0}>весь объект</button>
            </span>
            <span>{`${fmt(gwin.start).toUpperCase()} — ${fmt(isoOf(toN(gwin.start) + gwin.days - 1)).toUpperCase()}`}</span>
          </div>
          <div className="gscale">{scale.map((s, i) => <span key={i}>{s}</span>)}</div>
        </div>
        {rows.map((w) => <GanttRow key={w.id} w={w} win={gwin} asOf={data.as_of} resolved={resolved} />)}
        <div className="glegend">
          <span><i style={{ border: '1px dashed var(--muted)' }} />ПЛАН ПО ГРАФИКУ</span>
          <span><i className="f-ok" />РАБОТА ИДЁТ</span>
          <span><i className="f-warn" />ТОЛЬКО РЕСУРСЫ</span>
          <span><i className="f-bad" />НИЧЕГО НЕ ОБНАРУЖЕНО</span>
          <span><i className="f-done" />ЗАВЕРШЕНО</span>
          <span><i className="f-manual" />РЕШЕНО ВРУЧНУЮ</span>
          <span><i style={{ border: '1px dashed var(--warn)' }} />ПРОГНОЗ ПО ТЕМПУ</span>
          <span><i style={{ border: '1px dotted var(--faint)', height: 4 }} />ПЕРВАЯ ВЕРСИЯ ПЛАНА</span>
          <span><i style={{ background: 'var(--paper3)' }} />ВЫХОДНОЙ</span>
        </div>
        {outside ? (
          <div className="gfoot">{`ЕЩЁ ${outside} ${plural(outside, ['РАБОТА', 'РАБОТЫ', 'РАБОТ'])} ВНЕ ОКНА ШЕСТИ НЕДЕЛЬ · ОКНО ДВИГАЕТСЯ ВМЕСТЕ С «СЕГОДНЯ» · ПЕРЕКЛЮЧИТЕ НА «ВЕСЬ ОБЪЕКТ»`}</div>
        ) : null}
      </div>
    </div>
  );
}
