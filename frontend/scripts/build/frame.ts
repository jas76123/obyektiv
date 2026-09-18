import type { CameraShift } from '@/contract';
import { classLabel } from '@/contract/labels';
import { fmt } from '@/lib/format';
import { CAMS } from '../seed';
import type { SeedWork } from '../seed/types';
import { AS_OF, obj, framesIndex, framesOf, objectOfCamera, cameraState, cameraOfWork, entryFor, expectedFound, levelsOf } from './context';

export function cameraDates(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const key of framesIndex().keys()) {
    const [cam, date] = key.split('|') as [string, string];
    out.set(cam, [...(out.get(cam) ?? []), date]);
  }
  for (const list of out.values()) list.sort();
  return out;
}

/** Работа, которая по графику идёт в зоне камеры в эту дату: сначала та, что описана в справочнике. */
function linkedWork(objectId: string, cameraId: string, date: string): { id: string; w: SeedWork } | null {
  const seed = Object.values(CAMS).find((c) => c.id === cameraId && c.date === date && c.obj === objectId);
  const o = obj(objectId);
  if (seed && o.works[seed.work]) return { id: seed.work, w: o.works[seed.work]! };
  const zone = cameraState(objectId, cameraId).zone;
  const inZone = o.order
    .map((id) => ({ id, w: o.works[id]! }))
    .filter((x) => (cameraOfWork(objectId, x.w) === cameraId || x.w.zone === zone) && x.w.ps <= date && date <= x.w.pe);
  return inZone.find((x) => entryFor(x.w.name)) ?? inZone[0] ?? null;
}

export function buildFrameShift(cameraId: string, date: string): CameraShift {
  const objectId = objectOfCamera(cameraId);
  const o = obj(objectId);
  const link = linkedWork(objectId, cameraId, date);
  const entry = link ? entryFor(link.w.name) : null;
  const seed = Object.values(CAMS).find((c) => c.id === cameraId && c.date === date && c.obj !== 'sev');
  const level = link ? levelsOf(o, link.w)[date] ?? null : null;

  let note = 'По графику в зоне этой камеры в эту дату работ нет.';
  if (seed) note = seed.note.replace(/<\/?b>/g, '');
  else if (link) {
    const need = entry
      ? ' Ожидалось: ' + [...Object.entries(entry.classes).map(([c, n]) => `${classLabel(c)} ≥${n}`), `людей ≥${entry.people}`].join(', ') + '.'
      : ' Вид работ не описан в справочнике признаков.';
    note = `По графику в этой зоне: ${link.w.name}, ${fmt(link.w.ps)} — ${fmt(link.w.pe)}.${need}`;
  }

  return {
    as_of: AS_OF,
    object: { id: objectId, short_name: o.short },
    camera: cameraState(objectId, cameraId),
    date,
    dates: cameraDates().get(cameraId) ?? [],
    link: {
      work_id: link?.id ?? null,
      work_name: link?.w.name ?? null,
      note,
      step01: level === null ? null : level >= 1,
      step02: level === null ? null : level >= 2,
    },
    frames: framesOf(cameraId, date).map((f, i) => ({
      ...f,
      expected_found: seed ? (seed.frames[i]?.hit ?? false) : expectedFound(f, entry),
    })),
  };
}
