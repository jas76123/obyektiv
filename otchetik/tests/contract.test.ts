import { describe, expect, it } from 'vitest';
import {
  LeaderboardResponse,
  ObjectsResponse,
  PhotosResponse,
  ScheduleResponse,
  ShotsStatusResponse,
  UploadResponse,
} from '../contract/schemas';
import { demo, demoShots } from '../demo';

describe('demo data matches contract', () => {
  it('objects', () => {
    const r = ObjectsResponse.parse(demo.objects);
    expect(r.objects[0].brigades.length).toBe(3);
  });
  it('schedule has three tasks for brigade 1', () => {
    const r = ScheduleResponse.parse(demo.schedule);
    expect(r.tasks.map((t) => t.name)).toEqual(['Установка дверей', 'Бетонирование', 'Армирование']);
  });
  it('shots status covers all verdict kinds', () => {
    const r = ShotsStatusResponse.parse(demo.shotsStatus);
    const statuses = new Set(r.shots.map((s) => s.status));
    expect(statuses.has('under_review')).toBe(true);
    expect(statuses.has('rework')).toBe(true);
    expect(statuses.has('accepted')).toBe(true);
  });
  it('rejects invalid verdict value', () => {
    expect(() =>
      ShotsStatusResponse.parse({
        shots: [{ local_uuid: 'a', status: 'accepted', verdict: 'maybe', updated_at: 'x' }],
      })
    ).toThrow();
  });
  it('demo shots with verdict statuses have verdict === status', () => {
    const r = ShotsStatusResponse.parse(demo.shotsStatus);
    const verdictStatuses = ['accepted', 'partial', 'rework', 'rejected'];
    for (const shot of r.shots) {
      if (verdictStatuses.includes(shot.status)) {
        expect(shot.verdict).toBe(shot.status);
      }
    }
  });
  it('doors task has no shot in demoShots and shots-status', () => {
    expect(demoShots().some((s) => s.task_id === 't-doors-0922')).toBe(false);
    const r = ShotsStatusResponse.parse(demo.shotsStatus);
    expect(r.shots.some((s) => s.local_uuid === 'demo-doors-1')).toBe(false);
  });
  it('leaderboard', () => {
    const r = LeaderboardResponse.parse(demo.leaderboard);
    expect(r.brigades[0].points).toBe(178);
  });
  it('upload response', () => {
    expect(UploadResponse.parse({ server_id: 's1', status: 'uploaded' }).server_id).toBe('s1');
  });
  it('rejects wrong status', () => {
    expect(() => ShotsStatusResponse.parse({ shots: [{ local_uuid: 'a', status: 'done', updated_at: 'x' }] })).toThrow();
  });
  it('photos: реальный ответ /photos разбирается, file и timestamp есть', () => {
    const r = PhotosResponse.parse(demo.photos);
    expect(r.photos.length).toBe(2);
    expect(r.photos[0]).toMatchObject({ id: '997c7740-90dd-445d-a7dc-d517b2c794ec', file: '997c7740-90dd-445d-a7dc-d517b2c794ec_t.jpg', timestamp: '2026-09-25T16:50:02.776265' });
    expect(r.photos[1].detections.length).toBe(1);
  });
  it('photos: кривая запись пропускается, остальные остаются', () => {
    const r = PhotosResponse.parse({ photos: [{ id: 1, detections: null }, { id: 'ok', file: 'x_a.b.c.jpg', timestamp: 't', detections: [] }] });
    expect(r.photos.map((p) => p.id)).toEqual(['ok']);
  });
});
