import { describe, it, expect, beforeEach } from 'vitest';
import { addContact, contactFor, loadContacts } from '@/store/contacts';
import type { Alert, Contact } from '@/contract';

describe('contacts', () => {
  beforeEach(() => {
    // Clear storage between tests
    const memory = new Map();
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
  });

  it('loadContacts возвращает пустой массив когда нет хранилища (node env)', () => {
    const contacts = loadContacts();
    expect(contacts).toEqual([]);
  });

  it('addContact: один контакт на пару «подрядчик + объект» — добавление заменяет старый', () => {
    const contact1: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-1',
      name: 'Иван',
      role: 'прораб',
      phone: '+79991234567',
      telegram: '@ivan',
      max: null,
      email: 'ivan@example.com',
      scope: null,
      escalation: null,
    };
    const contact2: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-1',
      name: 'Петр',
      role: 'мастер',
      phone: '+79997654321',
      telegram: '@petr',
      max: null,
      email: 'petr@example.com',
      scope: null,
      escalation: null,
    };

    let result = addContact(contact1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(contact1);

    // Добавление второго контакта для той же пары заменяет первый
    result = addContact(contact2);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(contact2);
  });

  it('addContact: контакт для другой пары сохраняется рядом с существующим', () => {
    const contact1: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-1',
      name: 'Иван',
      role: 'прораб',
      phone: null,
      telegram: null,
      max: null,
      email: null,
      scope: null,
      escalation: null,
    };
    const contact2: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-2',
      name: 'Петр',
      role: null,
      phone: null,
      telegram: null,
      max: null,
      email: null,
      scope: null,
      escalation: null,
    };

    let result = addContact(contact1);
    expect(result).toHaveLength(1);

    result = addContact(contact2);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(contact1);
    expect(result).toContainEqual(contact2);
  });

  it('contactFor: локально добавленный контакт для пары (подрядчик + объект) выигрывает у a.contact', () => {
    const localContact: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-1',
      name: 'Иван Локальный',
      role: null,
      phone: null,
      telegram: null,
      max: null,
      email: null,
      scope: null,
      escalation: null,
    };
    const serverContact: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-1',
      name: 'Иван Сервер',
      role: null,
      phone: null,
      telegram: null,
      max: null,
      email: null,
      scope: null,
      escalation: null,
    };
    const alert: Alert = {
      id: 'A-01',
      object_id: 'obj-1',
      object_name: 'Объект 1',
      object_short: 'Об-1',
      work_id: 'W-01',
      work_name: 'Работа',
      zone: 'Зона А',
      contractor: 'ООО Стройка',
      kind: 'claim',
      status: 'in_progress',
      status_reason: null,
      tags: [],
      severity: 1,
      tone: 'ok',
      verdict: 'тест',
      triad: {
        plan_today: 10,
        declared: { percent: 50, report_date: null, author: null, fact_source: null },
        confirmed: 45,
        confirmed_days: 2,
        elapsed_days: 3,
        note: 'note',
      },
      schedule: { plan_start: '2026-09-01', plan_end: '2026-09-30', fact_start: null, forecast_end: null },
      evidence: { frame: null, label: 'label', sub: 'sub', camera_id: null, date: null },
      untouched_days: 0,
      handling: { state: 'new' },
      contact: serverContact,
    };

    const added = [localContact];
    const result = contactFor(alert, added);
    expect(result).toEqual(localContact);
  });

  it('contactFor: без локального контакта возвращает a.contact', () => {
    const serverContact: Contact = {
      contractor: 'ООО Стройка',
      object_id: 'obj-1',
      name: 'Иван Сервер',
      role: null,
      phone: null,
      telegram: null,
      max: null,
      email: null,
      scope: null,
      escalation: null,
    };
    const alert: Alert = {
      id: 'A-01',
      object_id: 'obj-1',
      object_name: 'Объект 1',
      object_short: 'Об-1',
      work_id: 'W-01',
      work_name: 'Работа',
      zone: 'Зона А',
      contractor: 'ООО Стройка',
      kind: 'claim',
      status: 'in_progress',
      status_reason: null,
      tags: [],
      severity: 1,
      tone: 'ok',
      verdict: 'тест',
      triad: {
        plan_today: 10,
        declared: { percent: 50, report_date: null, author: null, fact_source: null },
        confirmed: 45,
        confirmed_days: 2,
        elapsed_days: 3,
        note: 'note',
      },
      schedule: { plan_start: '2026-09-01', plan_end: '2026-09-30', fact_start: null, forecast_end: null },
      evidence: { frame: null, label: 'label', sub: 'sub', camera_id: null, date: null },
      untouched_days: 0,
      handling: { state: 'new' },
      contact: serverContact,
    };

    const added: Contact[] = [];
    const result = contactFor(alert, added);
    expect(result).toEqual(serverContact);
  });

  it('contactFor: возвращает null когда нет ни локального ни серверного контакта', () => {
    const alert: Alert = {
      id: 'A-01',
      object_id: 'obj-1',
      object_name: 'Объект 1',
      object_short: 'Об-1',
      work_id: 'W-01',
      work_name: 'Работа',
      zone: 'Зона А',
      contractor: 'ООО Стройка',
      kind: 'claim',
      status: 'in_progress',
      status_reason: null,
      tags: [],
      severity: 1,
      tone: 'ok',
      verdict: 'тест',
      triad: {
        plan_today: 10,
        declared: { percent: 50, report_date: null, author: null, fact_source: null },
        confirmed: 45,
        confirmed_days: 2,
        elapsed_days: 3,
        note: 'note',
      },
      schedule: { plan_start: '2026-09-01', plan_end: '2026-09-30', fact_start: null, forecast_end: null },
      evidence: { frame: null, label: 'label', sub: 'sub', camera_id: null, date: null },
      untouched_days: 0,
      handling: { state: 'new' },
      contact: null,
    };

    const added: Contact[] = [];
    const result = contactFor(alert, added);
    expect(result).toBeNull();
  });
});
