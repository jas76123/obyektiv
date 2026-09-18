import { OBJECTS, CAMS, TODAY } from '../seed';
import type { SeedObject, SeedWork } from '../seed/types';
import { demoFrames, demoCameras, demoCatalog, type CatalogEntry } from '../seed/demo';
import { IMAGES } from '../seed/images';
import { mapStatus } from '../seed/map';
import type { Frame, Level, Status, StatusReason, Tag, CameraState } from '@/contract';
import { toN, isoOf, isWeekend, workdays } from '@/lib/format';

export const AS_OF = TODAY;
/** Объект, у которого кадры берутся из data/demo, а не из макета. */
export const DEMO_OBJECT = 'sev';
const W = 1920;
const H = 1080;

export function obj(id: string): SeedObject {
  const o = OBJECTS[id];
  if (!o) throw new Error(`Нет объекта ${id}`);
  return o;
}
export function work(objectId: string, workId: string): SeedWork {
  const w = obj(objectId).works[workId];
  if (!w) throw new Error(`Нет работы ${workId} в объекте ${objectId}`);
  return w;
}
export function objectOfWork(workId: string): string {
  const id = Object.keys(OBJECTS).find((k) => OBJECTS[k]!.works[workId]);
  if (!id) throw new Error(`Работа ${workId} не найдена ни в одном объекте`);
  return id;
}

/** Порядок проверок как в daylevel.py: «не начата» раньше всех остальных. */
export function statusOf(w: SeedWork): { status: Status; reason: StatusReason | null } {
  if (AS_OF < w.ps) return { status: 'not_started', reason: null };
  return { status: mapStatus(w.status), reason: (w.why as StatusReason | undefined) ?? null };
}

export function workTags(w: SeedWork): Tag[] {
  const tags: Tag[] = [];
  if (w.reptag) tags.push({ kind: w.reptag[0] as 'rep' | 'lag', text: w.reptag[1] });
  if (w.sched) tags.push({ kind: 'sched', text: w.sched });
  return tags;
}

function actsOf(o: SeedObject): string[] {
  return (o.acts ?? []).map((a) => a[0]);
}

/** Уровни по дням. У завершённых работ макет дней не хранит: все рабочие дни факта = 2. */
export function levelsOf(o: SeedObject, w: SeedWork): Record<string, Level> {
  const acts = new Set(actsOf(o));
  const out: Record<string, Level> = {};
  if (w.days) {
    for (const [d, lv] of Object.entries(w.days)) if (d <= AS_OF && !acts.has(d)) out[d] = lv as Level;
    return out;
  }
  if (w.status === 'confirmed' && w.fs && w.fe) {
    for (let t = toN(w.fs); t <= Math.min(toN(w.fe), toN(AS_OF)); t++) {
      const d = isoOf(t);
      if (!isWeekend(d) && !acts.has(d)) out[d] = 2;
    }
  }
  return out;
}

/** Прошедшие рабочие дни плана без дней простоя по акту и сколько из них с уровнем 2. */
export function elapsedOf(o: SeedObject, w: SeedWork): { total: number; elapsed: number; confirmed: number } {
  const total = workdays(w.ps, w.pe);
  if (AS_OF < w.ps) return { total, elapsed: 0, confirmed: 0 };
  const acts = new Set(actsOf(o));
  const levels = levelsOf(o, w);
  let elapsed = 0;
  let confirmed = 0;
  for (let t = toN(w.ps); t <= Math.min(toN(w.pe), toN(AS_OF)); t++) {
    const d = isoOf(t);
    if (isWeekend(d) || acts.has(d)) continue;
    elapsed++;
    if (levels[d] === 2) confirmed++;
  }
  return { total, elapsed, confirmed };
}

const catalog = demoCatalog();
/** Самое длинное совпадение вида работ по вхождению в название, как в scripts/make_demo_detections.py. */
export function entryFor(name: string): CatalogEntry | null {
  const hits = catalog.filter((e) => name.toLowerCase().includes(e.pattern));
  return hits.sort((a, b) => b.pattern.length - a.pattern.length)[0] ?? null;
}

export function cameraOfWork(objectId: string, w: SeedWork): string | null {
  if (w.cam && CAMS[w.cam]) return CAMS[w.cam]!.id;
  if (objectId === DEMO_OBJECT) return demoCameras().find((c) => c.zone === w.zone)?.camera_id ?? null;
  return null;
}

export function objectOfCamera(cameraId: string): string {
  const id = Object.keys(OBJECTS).find((k) => OBJECTS[k]!.camlist.some((c) => c[0] === cameraId));
  if (!id) throw new Error(`Камера ${cameraId} не найдена ни в одном объекте`);
  return id;
}

export function cameraState(objectId: string, cameraId: string): CameraState {
  const c = obj(objectId).camlist.find((x) => x[0] === cameraId);
  if (!c) throw new Error(`Нет камеры ${cameraId} в объекте ${objectId}`);
  const [id, text, state, last] = c;
  const zone = text.includes(' · ') ? text.split(' · ')[0]! : null;
  return { id, zone, description: text, state: state as CameraState['state'], last_frame: last };
}

/** Кадры макета: проценты → пиксели. Смены «Северного» пропускаются: для него кадры из data/demo. */
function seedCamFrames(): Frame[] {
  const out: Frame[] = [];
  for (const cam of Object.values(CAMS)) {
    if (cam.obj === DEMO_OBJECT) continue;
    for (const f of cam.frames) {
      const frame_id = `${cam.id}_${cam.date.replaceAll('-', '')}_${f.t.replace(':', '')}`;
      out.push({
        frame_id,
        camera_id: cam.id,
        captured_at: `${cam.date}T${f.t}:00+03:00`,
        image_path: IMAGES[frame_id] ?? null,
        width: W,
        height: H,
        detections: f.det.map(([cls, conf, b]) => ({
          class: cls,
          confidence: conf,
          bbox: [Math.round(b[0] * W / 100), Math.round(b[1] * H / 100), Math.round(b[2] * W / 100), Math.round(b[3] * H / 100)] as [number, number, number, number],
        })),
      });
    }
  }
  return out;
}

let cache: Map<string, Frame[]> | null = null;
/** Все кадры по ключу «камера|дата», внутри по времени. */
export function framesIndex(): Map<string, Frame[]> {
  if (cache) return cache;
  cache = new Map();
  for (const f of [...demoFrames(), ...seedCamFrames()]) {
    const key = `${f.camera_id}|${f.captured_at.slice(0, 10)}`;
    const list = cache.get(key) ?? [];
    list.push(f);
    cache.set(key, list);
  }
  for (const list of cache.values()) list.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  return cache;
}
export function framesOf(cameraId: string, date: string): Frame[] {
  return framesIndex().get(`${cameraId}|${date}`) ?? [];
}

const MIN_CONF = 0.5;
export function countsOf(f: Frame): { tech: number; people: number } {
  const seen = f.detections.filter((d) => d.confidence >= MIN_CONF);
  const people = seen.filter((d) => d.class === 'person').length;
  return { tech: seen.length - people, people };
}

/** Деление скраббера закрашено, если на кадре есть вся ожидаемая по справочнику техника. */
export function expectedFound(f: Frame, entry: CatalogEntry | null): boolean {
  if (!entry) return false;
  return Object.entries(entry.classes).every(
    ([cls, need]) => f.detections.filter((d) => d.class === cls && d.confidence >= MIN_CONF).length >= need,
  );
}

/** Ближайший по времени кадр смены к «ЧЧ:ММ». */
export function nearestFrame(frames: Frame[], hhmm: string): Frame | null {
  const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const target = mins(hhmm);
  return [...frames].sort((a, b) => Math.abs(mins(a.captured_at.slice(11, 16)) - target) - Math.abs(mins(b.captured_at.slice(11, 16)) - target))[0] ?? null;
}
