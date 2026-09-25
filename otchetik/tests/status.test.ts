import { describe, expect, it } from 'vitest';
import { SCREEN_COLOR, SCREEN_LABEL, foldStatus, photoChip, workStatus } from '../lib/status';

describe('foldStatus', () => {
  it('всё, что не вернули на пересъём, — в работе', () => {
    for (const s of ['queued', 'uploading', 'failed', 'uploaded', 'processing', 'processed', 'under_review', 'accepted', 'partial'] as const) {
      expect(foldStatus(s)).toBe('in_work');
    }
  });
  it('rework и rejected от сервера — переснять', () => {
    expect(foldStatus('rework')).toBe('retake');
    expect(foldStatus('rejected')).toBe('retake');
  });
  it('пустые детекции нейросети — переснять, каким бы ни был статус', () => {
    expect(foldStatus('uploaded', { mlEmpty: true })).toBe('retake');
    expect(foldStatus('accepted', { mlEmpty: true })).toBe('retake');
    expect(foldStatus('uploaded', { mlEmpty: false })).toBe('in_work');
  });
});

describe('workStatus', () => {
  it('без фото — не начато', () => {
    expect(workStatus([])).toBe('not_started');
  });
  it('берёт статус самого свежего фото (первого в списке)', () => {
    expect(workStatus(['in_work', 'retake'])).toBe('in_work');
    expect(workStatus(['retake', 'in_work'])).toBe('retake');
  });
});

describe('слова и цвета', () => {
  it('три слова', () => {
    expect(SCREEN_LABEL).toEqual({ not_started: 'не начато', in_work: 'в работе', retake: 'переснять' });
  });
  it('три цвета из прежней палитры', () => {
    expect(SCREEN_COLOR).toEqual({ not_started: '#7C8079', in_work: '#1B5C8A', retake: '#AC3529' });
  });
  it('photoChip — только доставка', () => {
    expect(photoChip('queued')).toBe('ждёт сети');
    expect(photoChip('failed')).toBe('ждёт сети');
    expect(photoChip('uploading')).toBe('отправляется');
    expect(photoChip('uploaded')).toBe('отправлено');
    expect(photoChip('under_review')).toBe('отправлено');
    expect(photoChip('rework')).toBe('отправлено');
  });
  it('без адреса сервера очередь ждёт сервера, а не сети', () => {
    expect(photoChip('queued', { serverSet: false })).toBe('ждёт сервера');
    expect(photoChip('failed', { serverSet: false })).toBe('ждёт сервера');
    expect(photoChip('draft', { serverSet: false })).toBe('ждёт сервера');
    expect(photoChip('uploading', { serverSet: false })).toBe('отправляется');
    expect(photoChip('queued', { serverSet: true })).toBe('ждёт сети');
  });
});
