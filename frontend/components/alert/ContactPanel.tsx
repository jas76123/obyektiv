'use client';
import { useState } from 'react';
import type { Alert, Contact } from '@/contract';
import { buildRequestText } from '@/store/requestText';
import { telLink, telegramLink, maxLink, mailLink } from '@/store/links';
import { AddContactForm } from './AddContactForm';

function initials(name: string): string {
  const p = name.replace(/\./g, '').split(' ');
  return (p[0]?.[0] ?? '') + (p[1]?.[0] ?? '');
}

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Панель связи с подрядчиком (мокап 0.4, contactPanel, строки 845–871). */
export function ContactPanel(p: { alert: Alert; contact: Contact | null; asOf: string; onSent: (channel: string) => void; onAddContact: (c: Contact) => void }) {
  const { alert: a, contact: c } = p;
  const [text, setText] = useState(() => buildRequestText(a, p.asOf));
  const [copied, setCopied] = useState(false);

  if (!c) {
    return (
      <div className="nocontact">
        <b>Ответственный по подрядчику «{a.contractor}» на этом объекте не указан.</b> Обратиться не к кому: заполните контакт, иначе расхождение останется висеть без адресата.
        <AddContactForm contractor={a.contractor} objectId={a.object_id} onSave={p.onAddContact} />
      </div>
    );
  }

  const open = (href: string | null, channel: string) => {
    if (!href) return;
    window.open(href, '_blank', 'noopener');
    p.onSent(channel);
  };
  const subject = `${a.object_short}: ${a.work_name.toLowerCase()}`;
  const tel = telLink(c.phone), tg = telegramLink(c.telegram, text), mx = maxLink(c.max), mail = mailLink(c.email, subject, text);

  return (
    <div className="contact">
      <div className="person">
        <div className="pline"><i className="pava">{initials(c.name)}</i><span><span className="pname">{c.name}</span><span className="prole">{c.role} · {a.contractor}</span></span></div>
        <div className="pcontacts">
          {c.scope ? <span className="pc"><span>зона</span>{c.scope}</span> : null}
          {c.phone ? <span className="pc"><span>телефон</span>{c.phone}</span> : null}
          {c.telegram ? <span className="pc"><span>telegram</span>{c.telegram}</span> : null}
          {c.max ? <span className="pc"><span>макс</span>{c.max}</span> : null}
          {c.email ? <span className="pc"><span>почта</span>{c.email}</span> : null}
        </div>
        {c.escalation ? <p className="escal">Если ответа нет двое суток, эскалация: {c.escalation}</p> : null}
      </div>
      <div className="msg">
        <span className="msgh">Запрос собран из фактов расхождения · можно поправить</span>
        <textarea className="msgbox" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="msgacts">
          {mx ? <button className="act primary" type="button" onClick={async () => { await copy(text); open(mx, 'Макс'); }}>Макс · текст в буфере</button> : null}
          {tg ? <button className="act primary" type="button" onClick={() => open(tg, 'Telegram')}>Отправить в Telegram</button> : null}
          {tel ? <button className="act primary" type="button" onClick={() => open(tel, 'звонок')}>Позвонить</button> : null}
          {mail ? <button className="act" type="button" onClick={() => open(mail, 'письмо')}>Письмом</button> : null}
          <button className="act" type="button" onClick={async () => setCopied(await copy(text))}>{copied ? 'Скопировано' : 'Скопировать текст'}</button>
          <span className="evlabel" style={{ marginLeft: 4 }}>действие фиксируется в карточке</span>
        </div>
      </div>
    </div>
  );
}
