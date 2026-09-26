import { describe, expect, it } from 'vitest';
import {
  FINAL_WORK_STATUS, SCREEN_LABEL, VERDICT_WORD, dayVerdict, foldStatus, normalizeWorkStatus, photoChip, photoVerdict, photoWord, workStatus,
} from '../lib/status';

describe('normalizeWorkStatus', () => {
  it('пробел и подчёркивание — одно значение, регистр и края не важны', () => {
    expect(normalizeWorkStatus('not confirmed')).toBe('not_confirmed');
    expect(normalizeWorkStatus('not_confirmed')).toBe('not_confirmed');
    expect(normalizeWorkStatus('  Confirmed ')).toBe('confirmed');
    expect(normalizeWorkStatus('')).toBeNull();
    expect(normalizeWorkStatus(null)).toBeNull();
    expect(normalizeWorkStatus(undefined)).toBeNull();
  });
  it('окончательные значения сверки', () => {
    expect([...FINAL_WORK_STATUS].sort()).toEqual(['confirmed', 'not_confirmed', 'review']);
  });
});

describe('photoVerdict', () => {
  it('confirmed → принято; review и not confirmed → переснять', () => {
    expect(photoVerdict({ work_status: 'confirmed' })).toBe('accepted');
    expect(photoVerdict({ work_status: 'review' })).toBe('retake');
    expect(photoVerdict({ work_status: 'not confirmed' })).toBe('retake');
    expect(photoVerdict({ work_status: 'not_confirmed' })).toBe('retake');
  });
  it('unsure, неизвестное слово и отсутствие сверки — откат на детекции', () => {
    expect(photoVerdict({ work_status: 'unsure', empty: true })).toBe('retake');
    expect(photoVerdict({ work_status: 'unsure', empty: false })).toBeNull();
    expect(photoVerdict({ work_status: 'maybe', empty: true })).toBe('retake');
    expect(photoVerdict({ empty: true })).toBe('retake');
    expect(photoVerdict({ empty: false })).toBeNull();
    expect(photoVerdict()).toBeNull();
  });
  it('сверка главнее детекций: confirmed с пустыми детекциями — принято', () => {
    expect(photoVerdict({ work_status: 'confirmed', empty: true })).toBe('accepted');
  });
});

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
  it('вердикт «переснять» — переснять, пока сервер не вынес итог; «принято» у фото не делает работу принятой', () => {
    expect(foldStatus('uploaded', { verdict: 'retake' })).toBe('retake');
    expect(foldStatus('processed', { verdict: 'retake' })).toBe('retake');
    expect(foldStatus('under_review', { verdict: 'retake' })).toBe('retake');
    expect(foldStatus('uploaded', { verdict: 'accepted' })).toBe('in_work');
    expect(foldStatus('uploaded', { verdict: null })).toBe('in_work');
    // итог сервера главнее вердикта
    expect(foldStatus('accepted', { verdict: 'retake' })).toBe('in_work');
    expect(foldStatus('partial', { verdict: 'retake' })).toBe('in_work');
    expect(foldStatus('rework', { verdict: 'accepted' })).toBe('retake');
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

describe('dayVerdict', () => {
  it.each([
    [[], 'not_accepted'],
    [['retake'], 'not_accepted'],
    [['retake', 'retake'], 'not_accepted'],
    [['in_work'], 'accepted'],
    [['retake', 'in_work'], 'accepted'],
    [['in_work', 'retake', 'retake'], 'accepted'],
  ] as const)('%j → %s', (folded, want) => {
    expect(dayVerdict([...folded])).toBe(want);
  });
});

describe('слова', () => {
  it('пять слов чипа и два слова вердикта', () => {
    expect(SCREEN_LABEL).toEqual({ not_started: 'не начато', in_work: 'в работе', retake: 'переснять', accepted: 'принято', not_accepted: 'не принято' });
    expect(VERDICT_WORD).toEqual({ accepted: 'принято', retake: 'переснять' });
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
  it('photoWord: до доставки — слово доставки, после — вердикт, без вердикта — «отправлено»', () => {
    expect(photoWord('queued', 'accepted')).toBe('ждёт сети');
    expect(photoWord('queued', 'accepted', { serverSet: false })).toBe('ждёт сервера');
    expect(photoWord('uploading', 'retake')).toBe('отправляется');
    expect(photoWord('uploaded', null)).toBe('отправлено');
    expect(photoWord('uploaded', 'accepted')).toBe('принято');
    expect(photoWord('processed', 'retake')).toBe('переснять');
    expect(photoWord('rework', null)).toBe('отправлено');
  });
});
