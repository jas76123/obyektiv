import type { Frame, RawDetection, RealItem, RealObservations, RealScene } from '@/contract';
import { MIN_CONFIDENCE } from '@/components/frameGeometry';

export const MIN_TRACK_FRAMES = 5;
export const SCENE_GAP_FRAMES = 15;
export const MOVE_RATIO = 0.25;

/** Классы модели (data.yaml Георгия) → коды фронта (contract/labels.ts). */
export const CLASS_MAP: Record<string, string> = {
  'Dump truck': 'dump_truck',
  'Excavator': 'excavator',
  'Motor grader': 'other',
  'Roller': 'roller',
  'Crane manipulator': 'crane_manipulator',
  'Gazelle': 'truck',
  'Forklift Standart': 'loader',
  'Bucket loader Big': 'loader',
  'Mixer': 'concrete_mixer',
  'Tanker': 'truck',
  'Bulldozer': 'bulldozer',
  'Cleaning equipment': 'other',
  'Truck': 'truck',
  'Trailer': 'truck',
  'Forklift Giraffe': 'loader',
  'Bucket loader Standart': 'loader',
  'Autocran': 'truck_crane',
};
export function frontClass(modelClass: string): string {
  return CLASS_MAP[modelClass] ?? 'other';
}

export type Track = {
  id: number;
  cls: string;
  modelClass: string;
  confidence: number;
  /** все записи трека по возрастанию кадра */
  records: RawDetection[];
  firstFrame: number;
  lastFrame: number;
};

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

/** Класс трека — голосованием: модель на одном объекте прыгает между классами. */
export function groupTracks(records: RawDetection[]): Track[] {
  const byId = new Map<number, RawDetection[]>();
  for (const r of records) {
    const list = byId.get(r.id);
    if (list) list.push(r); else byId.set(r.id, [r]);
  }
  const tracks: Track[] = [];
  for (const [id, list] of byId) {
    if (list.length < MIN_TRACK_FRAMES) continue;
    list.sort((a, b) => a.frame - b.frame);
    const votes = new Map<string, { n: number; sum: number }>();
    for (const r of list) {
      const v = votes.get(r.class) ?? { n: 0, sum: 0 };
      v.n += 1; v.sum += r.confidence;
      votes.set(r.class, v);
    }
    const [modelClass, win] = [...votes].sort((a, b) => b[1].n - a[1].n || b[1].sum - a[1].sum)[0]!;
    const confidence = round(win.sum / win.n, 2);
    if (confidence < MIN_CONFIDENCE) continue;
    tracks.push({ id, cls: frontClass(modelClass), modelClass, confidence, records: list, firstFrame: list[0]!.frame, lastFrame: list[list.length - 1]!.frame });
  }
  return tracks.sort((a, b) => a.firstFrame - b.firstFrame || a.id - b.id);
}

/** Сцена — треки, между которыми нет паузы длиннее SCENE_GAP_FRAMES. Вход отсортирован по firstFrame. */
export function splitScenes(tracks: Track[]): Track[][] {
  const scenes: Track[][] = [];
  let end = -Infinity;
  for (const t of tracks) {
    if (t.firstFrame - end > SCENE_GAP_FRAMES) scenes.push([]);
    scenes[scenes.length - 1]!.push(t);
    end = Math.max(end, t.lastFrame);
  }
  return scenes;
}

/** Кадр, где одновременно видно больше всего треков сцены; при равенстве — ранний. */
export function pickFrame(scene: Track[]): number {
  const seen = new Map<number, number>();
  for (const t of scene) for (const r of t.records) seen.set(r.frame, (seen.get(r.frame) ?? 0) + 1);
  return [...seen].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
}

export function moved(track: Track): boolean {
  const [cx0, cy0, w0, h0] = track.records[0]!.bbox;
  const limit = MOVE_RATIO * Math.min(w0, h0);
  return track.records.some((r) => Math.hypot(r.bbox[0] - cx0, r.bbox[1] - cy0) > limit);
}

export function toTopLeft([cx, cy, w, h]: [number, number, number, number]): [number, number, number, number] {
  return [round(cx - w / 2, 2), round(cy - h / 2, 2), w, h];
}

export function clock(sec: number): string {
  const s = Math.floor(sec);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

function countByClass(classes: string[]): { class: string; count: number }[] {
  const m = new Map<string, number>();
  for (const c of classes) m.set(c, (m.get(c) ?? 0) + 1);
  return [...m].map(([cls, count]) => ({ class: cls, count })).sort((a, b) => b.count - a.count || a.class.localeCompare(b.class));
}

export type BuildMeta = {
  detectionsFile: string;
  videoFile: string | null;
  fps: number;
  width: number;
  height: number;
  /** путь к JPG сцены для фронта или null, когда кадра нет */
  imagePath: (scene: number) => string | null;
};

export function buildObservations(records: RawDetection[], meta: BuildMeta): RealObservations {
  const tracks = groupTracks(records);
  const scenes: RealScene[] = splitScenes(tracks).map((sceneTracks, i) => {
    const n = i + 1;
    const pivot = pickFrame(sceneTracks);
    const detections: Frame['detections'] = [];
    for (const t of sceneTracks) {
      const r = t.records.find((x) => x.frame === pivot);
      if (r) detections.push({ class: t.cls, confidence: t.confidence, bbox: toTopLeft(r.bbox), track_id: t.id });
    }
    const items: RealItem[] = sceneTracks.map((t) => ({ track_id: t.id, class: t.cls, model_class: t.modelClass, confidence: t.confidence, moved: moved(t), frames: t.records.length }));
    return {
      scene: n,
      time_from: round(Math.min(...sceneTracks.map((t) => t.firstFrame)) / meta.fps, 3),
      time_to: round(Math.max(...sceneTracks.map((t) => t.lastFrame)) / meta.fps, 3),
      frame: { frame_id: `scene-${String(n).padStart(2, '0')}`, camera_id: 'video', captured_at: clock(pivot / meta.fps), image_path: meta.imagePath(n), width: meta.width, height: meta.height, detections },
      items,
      counts: countByClass(items.map((x) => x.class)),
    };
  });
  return {
    source: { detections_file: meta.detectionsFile, video_file: meta.videoFile, fps: meta.fps, records: records.length, tracks_total: new Set(records.map((r) => r.id)).size, tracks_kept: tracks.length },
    summary: countByClass(tracks.map((t) => t.cls)),
    scenes,
  };
}

/** Кадр сцены в ролике: нужен оболочке для ffmpeg. */
export function pivotFrames(records: RawDetection[]): number[] {
  return splitScenes(groupTracks(records)).map(pickFrame);
}
