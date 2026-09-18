import { describe, it, expect } from 'vitest';
import { effective, markSeen, markContacted, closeWith, manualTag, resolvesWork, ME, type Handling } from '@/store/handling';
import type { Alert } from '@/contract';

const now = new Date(2026, 8, 4, 17, 5);
const seedNew = { id: 'A-01', handling: { state: 'new' } } as Alert;
const seedContacted = { id: 'A-02', handling: { state: 'contacted', by: 'Ковалёв А.', due: '8 сентября' } } as Alert;

describe('handling', () => {
  it('состояние из браузера перекрывает серверное', () => {
    expect(effective(seedNew, {}).state).toBe('new');
    expect(effective(seedContacted, {}).by).toBe('Ковалёв А.');
    expect(effective(seedNew, { 'A-01': { state: 'seen' } }).state).toBe('seen');
  });
  it('просмотрено: только из «новое»', () => {
    expect(markSeen({ state: 'new' }, now)).toMatchObject({ state: 'seen', by: ME.name, at: '4 сен 17:05' });
    const c: Handling = { state: 'contacted' };
    expect(markSeen(c, now)).toBe(c);
  });
  it('запрос отправлен: срок ответа +2 рабочих дня от даты среза', () => {
    expect(markContacted({ state: 'seen' }, { target: 'Сафин Р. И.', channel: 'Telegram', asOf: '2026-09-04', now })).toMatchObject({
      state: 'contacted', target: 'Сафин Р. И.', channel: 'Telegram', due: '8 сентября',
    });
  });
  it('закрыть без комментария нельзя', () => {
    expect(() => closeWith({ state: 'seen' }, { outcome: 'explained', comment: '  ', now })).toThrow(/комментар/i);
    expect(closeWith({ state: 'seen' }, { outcome: 'explained', comment: 'привезли акт', now })).toMatchObject({ state: 'closed', outcome: 'explained', comment: 'привезли акт' });
  });
  it('метка исхода и перевод работы в «решено вручную»', () => {
    const explained: Handling = { state: 'closed', outcome: 'explained' };
    const held: Handling = { state: 'closed', outcome: 'held' };
    expect(manualTag(explained)).toEqual({ kind: 'manual', text: 'РЕШЕНО ВРУЧНУЮ · ОБЪЯСНЕНО ПОДРЯДЧИКОМ' });
    expect(manualTag(held)).toEqual({ kind: 'manual', text: 'УДЕРЖАНИЕ ПО КС-2' });
    expect(manualTag({ state: 'seen' })).toBeNull();
    expect([resolvesWork(explained), resolvesWork(held)]).toEqual([true, false]);
  });
});
