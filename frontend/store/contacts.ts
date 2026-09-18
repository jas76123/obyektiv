import { ContactSchema, type Alert, type Contact } from '@/contract';
import { load, save } from './storage';

const KEY = 'contacts';

export function loadContacts(): Contact[] {
  return load<unknown[]>(KEY, []).flatMap((c) => {
    const r = ContactSchema.safeParse(c);
    return r.success ? [r.data] : [];
  });
}

/** Один контакт на пару «подрядчик + объект»: новый заменяет старый. */
export function addContact(c: Contact): Contact[] {
  const next = [...loadContacts().filter((x) => !(x.contractor === c.contractor && x.object_id === c.object_id)), c];
  save(KEY, next);
  return next;
}

export function contactFor(a: Alert, added: Contact[]): Contact | null {
  return added.find((c) => c.contractor === a.contractor && c.object_id === a.object_id) ?? a.contact;
}
