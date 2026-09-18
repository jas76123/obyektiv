import type { WorkReview, Shift, Triad } from '@/contract';
import { REASON_LABEL } from '@/contract/labels';
import { isoOf, toN, isWeekend } from '@/lib/format';
import { AS_OF, obj, work, statusOf, workTags, levelsOf, elapsedOf, cameraOfWork, framesOf } from './context';

const NOT_CHECKED_TEXT: Record<string, string> = {
  no_catalog: 'Вид работ не описан в справочнике признаков: система его не проверяет и ничего о нём не утверждает. Опишите признаки в настройке либо проверьте работу вручную.',
  no_observable: 'У работы нет признаков, видимых с камеры: она выполняется вручную или внутри здания. Система её не проверяет.',
  no_camera: 'На зоне работы нет камеры. План и заявленный факт показаны, наблюдение не ведётся.',
  no_frames: 'Камера зоны не отдавала кадры в дни этапа. Проверьте камеру.',
};

export function buildReview(objectId: string, workId: string): WorkReview {
  const o = obj(objectId);
  const w = work(objectId, workId);
  const st = statusOf(w);
  const el = elapsedOf(o, w);
  const mode: WorkReview['mode'] =
    st.status === 'not_started' ? 'not_started'
    : st.status === 'not_checked' ? 'not_checked'
    : w.ladder ? 'full' : 'done';

  const verdict =
    mode === 'full' ? (w.verdict ?? '')
    : mode === 'done' ? `Работа завершена и подтверждена наблюдением: ${el.confirmed} из ${el.elapsed} рабочих дней этапа.`
    : mode === 'not_checked' ? `${REASON_LABEL[st.reason ?? 'no_observable']}. ${NOT_CHECKED_TEXT[st.reason ?? 'no_observable']}`
    : 'Работа по графику ещё не началась: наблюдений нет.';

  const ladder: WorkReview['ladder'] =
    mode === 'full' ? [w.ladder![0] ?? null, w.ladder![1] ?? null, null, w.ladder![3] ?? null]
    : mode === 'done' ? [true, true, null, true]
    : [null, null, null, w.fact >= 100];

  const observed = mode === 'full' || mode === 'done';
  const triad: Triad | null = mode === 'not_started' ? null : {
    plan_today: el.total ? Math.round((el.elapsed / el.total) * 100) : 0,
    declared: { percent: w.fact },
    confirmed: observed && st.status !== 'insufficient' && el.elapsed ? Math.round((el.confirmed / el.elapsed) * 100) : null,
    confirmed_days: el.confirmed,
    elapsed_days: el.elapsed,
    note: observed && st.status !== 'insufficient' ? `${el.confirmed} из ${el.elapsed} дней` : st.status === 'insufficient' ? 'недостаточно кадров' : 'не проверяется',
  };

  const shifts: Record<string, Shift> = {};
  const camera = cameraOfWork(objectId, w);
  if (camera && observed) {
    for (let t = toN(w.ps); t <= Math.min(toN(w.pe), toN(AS_OF)); t++) {
      const d = isoOf(t);
      if (isWeekend(d)) continue;
      const frames = framesOf(camera, d);
      if (frames.length) shifts[d] = { camera_id: camera, frames };
    }
  }

  return {
    as_of: AS_OF,
    object: { id: objectId, name: o.name, short_name: o.short },
    work: {
      id: workId, name: w.name, zone: w.zone, contractor: w.contr, plan_start: w.ps, plan_end: w.pe,
      declared: { percent: w.fact }, status: st.status, status_reason: st.reason, tags: workTags(w),
    },
    mode,
    ladder,
    verdict,
    expected: (w.expect ?? []).map(([label, expected, found, in_frame, ok]) => ({ label, expected, found, in_frame, ok })),
    triad,
    calendar: { days: levelsOf(o, w), acts: (o.acts ?? []).map((a) => a[0]), confirmed_days: el.confirmed, elapsed_days: el.elapsed },
    shifts,
    causes: w.causes ?? [],
    history: (w.history ?? []).map(([when, what, who, reason]) => ({ when, what, who, reason })),
  };
}
