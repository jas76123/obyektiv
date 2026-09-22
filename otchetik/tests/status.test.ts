import { describe, expect, it } from 'vitest';
import { SCREEN_LABEL, foldStatus, photoChip, workStatus } from '../lib/status';

describe('foldStatus', () => {
  it('local statuses are in_work', () => {
    expect(foldStatus('queued')).toBe('in_work');
    expect(foldStatus('uploading')).toBe('in_work');
    expect(foldStatus('failed')).toBe('in_work');
  });
  it('server pre-verdict statuses are on_review', () => {
    for (const s of ['uploaded', 'processing', 'processed', 'under_review'] as const) {
      expect(foldStatus(s)).toBe('on_review');
    }
  });
  it('verdicts map one to one', () => {
    expect(foldStatus('accepted')).toBe('accepted');
    expect(foldStatus('partial')).toBe('partial');
    expect(foldStatus('rework')).toBe('rework');
    expect(foldStatus('rejected')).toBe('rejected');
  });
});

describe('workStatus priority', () => {
  it('empty is not_started', () => {
    expect(workStatus([])).toBe('not_started');
  });
  it('rework beats accepted', () => {
    expect(workStatus(['accepted', 'rework'])).toBe('rework');
  });
  it('in_work beats on_review and accepted', () => {
    expect(workStatus(['accepted', 'on_review', 'in_work'])).toBe('in_work');
  });
  it('partial beats accepted', () => {
    expect(workStatus(['accepted', 'partial'])).toBe('partial');
  });
});

describe('labels', () => {
  it('every screen status has a russian word', () => {
    expect(SCREEN_LABEL.rework).toBe('на доработку');
    expect(SCREEN_LABEL.in_work).toBe('в работе');
  });
  it('photo chip words', () => {
    expect(photoChip('queued')).toBe('ждёт сети');
    expect(photoChip('uploading')).toBe('отправляется');
    expect(photoChip('uploaded')).toBe('отправлено');
    expect(photoChip('under_review')).toBe('на проверке');
    expect(photoChip('accepted')).toBe('принято');
  });
});
