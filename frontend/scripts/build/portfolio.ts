import { OBJECTS, OBJ_ORDER, ALERTS, CONTACTS } from '../seed';
import type { SeedAlert, SeedObject } from '../seed/types';
import type { Alert, Contact, ObjectCard, Portfolio, Tag, Tone, Triad } from '@/contract';
import { OUTCOMES } from '@/contract/labels';
import { fmt, isoOf, toN, workdays } from '@/lib/format';
import { summarize } from '@/store/summary';
import { AS_OF, obj, work, statusOf, workTags, framesOf, nearestFrame, countsOf } from './context';

/** Кадр-основание замечания: камера, дата, время из подписи макета. */
const EVIDENCE: Record<string, { camera: string; date: string; time: string }> = {
  'A-01': { camera: 'КАМ-02', date: '2026-09-03', time: '09:40' },
  'A-02': { camera: 'КАМ-П1', date: '2026-09-03', time: '11:30' },
  'A-03': { camera: 'КАМ-Р2', date: '2026-09-04', time: '13:40' },
  'A-04': { camera: 'КАМ-02', date: '2026-09-04', time: '14:30' },
  'A-05': { camera: 'КАМ-В1', date: '2026-09-04', time: '16:00' },
  'A-08': { camera: 'КАМ-02', date: '2026-08-20', time: '10:15' },
};

const TONE: Record<SeedAlert['kind'], Tone> = { bad: 'bad', warn: 'warn', ok: 'ok', setup: 'grey', acc: 'grey' };

export function delayDays(o: SeedObject): number | null {
  let worst: number | null = null;
  for (const id of o.order) {
    const w = o.works[id]!;
    if (!w.fcast) continue;
    const d = workdays(isoOf(toN(w.pe) + 1), w.fcast);
    if (worst === null || d > worst) worst = d;
  }
  return worst;
}

/** Счётчики работ объекта по наблюдению (objStats макета). */
export function workCounts(o: SeedObject): { total: number; ok: number; warn: number; bad: number; none: number } {
  const c = { total: o.order.length, ok: 0, warn: 0, bad: 0, none: 0 };
  for (const id of o.order) {
    const s = statusOf(o.works[id]!).status;
    if (s === 'in_progress') c.ok++;
    else if (s === 'resources_only') c.warn++;
    else if (s === 'false_completion' || s === 'nothing_detected') c.bad++;
    else if (s === 'not_checked' || s === 'insufficient') c.none++;
  }
  return c;
}

export function objectCard(id: string): ObjectCard {
  const o = obj(id);
  const c = workCounts(o);
  return {
    id,
    name: o.name,
    short_name: o.short,
    stage: o.stage,
    zone_type: o.type,
    cameras_count: o.cams,
    worst: o.cams === 0 ? 'none' : c.bad ? 'bad' : c.warn ? 'warn' : 'ok',
    not_checked_count: o.order.filter((wid) => statusOf(o.works[wid]!).status === 'not_checked').length,
    delay_days: delayDays(o),
    bars: { plan_today: o.plan, declared: o.rep, confirmed: o.cnf },
  };
}

export function contactOf(contractor: string, objectId: string): Contact | null {
  const c = CONTACTS[`${contractor}|${objectId}`];
  if (!c) return null;
  return { contractor, object_id: objectId, name: c.name, role: c.role, phone: c.phone, telegram: c.tg, max: null, email: null, scope: c.scope, escalation: c.esc };
}

function alertTags(a: SeedAlert): Tag[] {
  const w = work(a.obj, a.work);
  const tags: Tag[] = [];
  if (w.reptag) tags.push({ kind: w.reptag[0] as 'rep' | 'lag', text: w.reptag[1] });
  else if (a.obs !== 'nodata' && a.obs !== 'nocheck') {
    const cnf = a.days ? Math.round((a.cnfd / a.days) * 100) : 0;
    const gap = a.rep - cnf;
    const text = `ЗАЯВЛЕНО ${a.rep} % · В КАДРЕ ${a.cnfd} ДН ИЗ ${a.days}`;
    if (gap >= 20) tags.push({ kind: 'rep', text });
    else if (gap <= -20) tags.push({ kind: 'lag', text });
  }
  const sched = a.sched ?? w.sched;
  if (sched) tags.push({ kind: 'sched', text: sched });
  return tags;
}

function triadOf(a: SeedAlert): Triad {
  const unobserved = a.obs === 'nodata' || a.obs === 'nocheck';
  const note = a.obs === 'nodata' ? `кадры за ${a.cover} дней`
    : a.obs === 'nocheck' ? 'не проверяется'
    : a.days ? `${a.cnfd} из ${a.days} дней` : 'наблюдений нет';
  return {
    plan_today: a.plan,
    declared: { percent: a.rep },
    confirmed: unobserved ? null : a.days ? Math.round((a.cnfd / a.days) * 100) : 0,
    confirmed_days: a.cnfd,
    elapsed_days: a.days,
    note,
  };
}

function evidenceOf(a: SeedAlert): Alert['evidence'] {
  const e = EVIDENCE[a.id];
  const frame = e ? nearestFrame(framesOf(e.camera, e.date), e.time) : null;
  if (!e || !frame) return { frame: null, label: a.frameLbl, sub: a.frameSub, camera_id: e?.camera ?? null, date: e?.date ?? null };
  const c = countsOf(frame);
  return {
    frame,
    label: `${e.camera} · ${fmt(e.date).toUpperCase()}, ${frame.captured_at.slice(11, 16)}`,
    sub: `техника ${c.tech} · люди ${c.people}`,
    camera_id: e.camera,
    date: e.date,
  };
}

function buildAlert(a: SeedAlert): Alert {
  const o = obj(a.obj);
  const w = work(a.obj, a.work);
  const st = statusOf(w);
  const outcome = a.outcome ? OUTCOMES.find((x) => x.label === a.outcome)?.code ?? null : null;
  return {
    id: a.id,
    object_id: a.obj,
    object_name: o.name,
    object_short: o.short,
    work_id: a.work,
    work_name: w.name,
    zone: w.zone,
    contractor: w.contr,
    kind: a.kind === 'setup' ? 'setup' : 'claim',
    status: st.status,
    status_reason: st.reason,
    tags: alertTags(a),
    severity: a.sev,
    tone: TONE[a.kind],
    verdict: a.text,
    triad: triadOf(a),
    schedule: { plan_start: w.ps, plan_end: w.pe, fact_start: w.fs ?? null, forecast_end: w.fcast ?? null },
    evidence: evidenceOf(a),
    untouched_days: a.stale,
    handling: { state: a.handling, by: a.who ?? null, role: a.role ?? null, at: a.at ?? null, target: a.target ?? null, channel: a.channel ?? null, due: a.due ?? null, outcome, comment: null },
    contact: contactOf(w.contr, a.obj),
  };
}

export function buildPortfolio(): Portfolio {
  const alerts = ALERTS.map(buildAlert);
  return {
    as_of: AS_OF,
    objects: OBJ_ORDER.filter((id) => OBJECTS[id]).map(objectCard),
    summary: summarize(alerts, (a) => ({ state: a.handling.state, outcome: a.handling.outcome })),
    alerts,
  };
}
