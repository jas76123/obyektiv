'use client';
import { useState } from 'react';
import type { Contact } from '@/contract';

const FIELDS: Array<[keyof Contact, string]> = [['name', 'ФИО'], ['role', 'должность'], ['phone', 'телефон'], ['telegram', 'telegram'], ['max', 'макс'], ['email', 'почта']];

/** Форма добавления контакта подрядчика (мокап 0.4, часть contactPanel — «нет контакта», строки 845–847). */
export function AddContactForm(p: { contractor: string; objectId: string; onSave: (c: Contact) => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  const name = (v.name ?? '').trim();
  const hasChannel = ['phone', 'telegram', 'max', 'email'].some((k) => (v[k] ?? '').trim());
  return (
    <form className="catform" style={{ marginTop: 10 }} onSubmit={(e) => {
      e.preventDefault();
      if (!name || !hasChannel) return;
      p.onSave({ contractor: p.contractor, object_id: p.objectId, name, role: v.role || null, phone: v.phone || null, telegram: v.telegram || null, max: v.max || null, email: v.email || null, scope: null, escalation: null });
    }}>
      {FIELDS.map(([k, label]) => (
        <input key={k} className="box" placeholder={label} aria-label={label} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
      ))}
      <button className="act primary" type="submit" disabled={!name || !hasChannel}>Сохранить контакт</button>
      <span className="evlabel">нужны ФИО и хотя бы один канал · сохраняется в браузере и подставляется в следующие карточки подрядчика</span>
    </form>
  );
}
