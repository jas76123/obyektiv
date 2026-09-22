import { describe, expect, it } from 'vitest';
import {
  LeaderboardResponse,
  ObjectsResponse,
  ScheduleResponse,
  ShotsStatusResponse,
  UploadResponse,
} from '../contract/schemas';
import { demo } from '../demo';

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
    expect(statuses.has('accepted')).toBe(true);
    expect(statuses.has('under_review')).toBe(true);
    expect(statuses.has('rework')).toBe(true);
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
});
