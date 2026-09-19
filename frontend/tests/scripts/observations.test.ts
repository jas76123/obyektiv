import { describe, it, expect } from 'vitest';
import { RealObservationsSchema, type RawDetection } from '@/contract';
import { groupTracks, splitScenes, pickFrame, moved, toTopLeft, frontClass, clock, buildObservations } from '@/scripts/real/observations';

/** n записей трека подряд с кадра from; центр едет на dx за кадр. */
function run(id: number, cls: string, from: number, n: number, opt: { conf?: number; dx?: number; cx?: number } = {}): RawDetection[] {
  const { conf = 0.8, dx = 0, cx = 300 } = opt;
  return Array.from({ length: n }, (_, i) => ({
    frame: from + i, time_sec: Math.round(((from + i) / 30) * 1000) / 1000, id, class: cls, confidence: conf,
    bbox: [cx + dx * i, 400, 200, 100] as [number, number, number, number],
  }));
}

describe('треки', () => {
  it('класс трека = большинство записей', () => {
    const t = groupTracks([...run(1, 'Mixer', 0, 6), ...run(1, 'Tanker', 6, 3)]);
    expect(t).toHaveLength(1);
    expect(t[0]!.modelClass).toBe('Mixer');
    expect(t[0]!.cls).toBe('concrete_mixer');
    expect(t[0]!.records).toHaveLength(9);
  });
  it('при равенстве голосов побеждает большая сумма уверенности', () => {
    const t = groupTracks([...run(1, 'Mixer', 0, 3, { conf: 0.6 }), ...run(1, 'Excavator', 3, 3, { conf: 0.9 })]);
    expect(t[0]!.modelClass).toBe('Excavator');
    expect(t[0]!.confidence).toBe(0.9);
  });
  it('короткие и неуверенные треки отбрасываются', () => {
    const t = groupTracks([...run(1, 'Mixer', 0, 4), ...run(2, 'Mixer', 0, 8, { conf: 0.45 }), ...run(3, 'Mixer', 0, 5)]);
    expect(t.map((x) => x.id)).toEqual([3]);
  });
});

describe('сцены', () => {
  it('разрыв больше 15 кадров начинает новую сцену, перекрытие склеивает', () => {
    const tracks = groupTracks([...run(1, 'Mixer', 0, 10), ...run(2, 'Excavator', 5, 10), ...run(3, 'Excavator', 40, 10)]);
    expect(splitScenes(tracks).map((s) => s.map((t) => t.id))).toEqual([[1, 2], [3]]);
  });
  it('разрыв ровно 15 кадров сцену не рвёт', () => {
    const tracks = groupTracks([...run(1, 'Mixer', 0, 10), ...run(2, 'Mixer', 24, 10)]);
    expect(splitScenes(tracks)).toHaveLength(1);
  });
  it('опорный кадр — где видно больше всего треков, при равенстве ранний', () => {
    const tracks = groupTracks([...run(1, 'Mixer', 0, 10), ...run(2, 'Excavator', 5, 10)]);
    expect(pickFrame(tracks)).toBe(5);
  });
});

describe('геометрия и подписи', () => {
  it('рамка от центра → от левого верхнего угла', () => {
    expect(toTopLeft([300, 400, 200, 100])).toEqual([200, 350, 200, 100]);
  });
  it('движение: сдвиг центра больше четверти меньшей стороны рамки', () => {
    const [still] = groupTracks(run(1, 'Mixer', 0, 10, { dx: 2 }));
    const [goes] = groupTracks(run(2, 'Mixer', 0, 10, { dx: 4 }));
    expect(moved(still!)).toBe(false);
    expect(moved(goes!)).toBe(true);
  });
  it('классы модели → коды фронта, незнакомый = other', () => {
    expect(frontClass('Dump truck')).toBe('dump_truck');
    expect(frontClass('Bucket loader Big')).toBe('loader');
    expect(frontClass('Autocran')).toBe('truck_crane');
    expect(frontClass('Что-то новое')).toBe('other');
  });
  it('время ролика', () => {
    expect(clock(16.8)).toBe('00:00:16');
    expect(clock(75)).toBe('00:01:15');
  });
});

describe('сборка наблюдений', () => {
  const records = [...run(1, 'Mixer', 0, 10), ...run(2, 'Excavator', 5, 10, { dx: 4, cx: 500 }), ...run(3, 'Excavator', 60, 6), ...run(4, 'Mixer', 60, 2)];
  const meta = { detectionsFile: 'video_detections.json', videoFile: 'Video.mp4', fps: 30, width: 720, height: 1280, imagePath: (n: number) => `/real/frames/scene-${n}.jpg` };

  it('результат проходит контракт и считает по трекам', () => {
    const obs = RealObservationsSchema.parse(buildObservations(records, meta));
    expect(obs.source).toMatchObject({ records: 28, tracks_total: 4, tracks_kept: 3, fps: 30 });
    expect(obs.summary).toEqual([{ class: 'excavator', count: 2 }, { class: 'concrete_mixer', count: 1 }]);
    expect(obs.scenes.map((s) => s.scene)).toEqual([1, 2]);
  });
  it('кадр сцены: рамки от угла, класс и уверенность от трека', () => {
    const s = buildObservations(records, meta).scenes[0]!;
    expect(s.frame).toMatchObject({ frame_id: 'scene-01', camera_id: 'video', captured_at: '00:00:00', image_path: '/real/frames/scene-1.jpg', width: 720, height: 1280 });
    expect(s.frame.detections).toEqual([
      { class: 'concrete_mixer', confidence: 0.8, bbox: [200, 350, 200, 100], track_id: 1 },
      { class: 'excavator', confidence: 0.8, bbox: [400, 350, 200, 100], track_id: 2 },
    ]);
    expect(s.items.map((i) => [i.track_id, i.moved, i.frames])).toEqual([[1, false, 10], [2, true, 10]]);
    expect(s.counts).toEqual([{ class: 'concrete_mixer', count: 1 }, { class: 'excavator', count: 1 }]);
    expect([s.time_from, s.time_to]).toEqual([0, 0.467]);
  });
  it('пустой вход → пустые сцены', () => {
    expect(buildObservations([], meta)).toMatchObject({ scenes: [], summary: [] });
  });
});
