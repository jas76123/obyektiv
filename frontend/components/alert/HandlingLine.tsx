import Link from 'next/link';
import type { Alert, Contact } from '@/contract';
import { OUTCOMES } from '@/contract/labels';
import type { Handling } from '@/store/handling';
import { plural } from '@/lib/format';

function initials(name: string): string {
  const p = name.replace(/\./g, '').split(' ');
  return (p[0]?.[0] ?? '') + (p[1]?.[0] ?? '');
}

/** Строка действий под карточкой замечания (мокап 0.4, handlingBlock, строки 819–835). */
export function HandlingLine(p: {
  alert: Alert; handling: Handling; contact: Contact | null;
  open: 'contact' | 'outcome' | null; onToggleContact: () => void; onToggleOutcome: () => void;
}) {
  const { alert: a, handling: h } = p;
  const detail = <Link className="act" href={`/work/?id=${encodeURIComponent(a.work_id)}`}>Подробно</Link>;
  const who = h.by ? <span className="who"><i className="ava">{initials(h.by)}</i>{h.state === 'seen' ? 'просмотрено · ' : ''}{h.by} · {h.role} · {h.at}</span> : null;
  const closeBtn = <button className="act" type="button" onClick={p.onToggleOutcome}>{p.open === 'outcome' ? 'Отменить' : 'Зафиксировать исход'}</button>;

  if (h.state === 'closed') {
    const label = OUTCOMES.find((o) => o.code === h.outcome)?.label ?? '';
    return <>{detail}<span className="closedline"><b>ЗАКРЫТО</b> · {label}{h.by ? <> · <i className="ava">{initials(h.by)}</i>{h.by} · {h.at}</> : null}{h.comment ? ` · ${h.comment}` : ''}</span></>;
  }
  if (h.state === 'contacted') {
    return <>{detail}{closeBtn}{who}<span className="await">→ {h.target}, {h.channel} · ждём ответ до {h.due}</span></>;
  }
  const short = p.contact ? p.contact.name.split(' ').slice(0, 2).join(' ') : 'ответственному';
  const contactBtn = <button className="act primary" type="button" onClick={p.onToggleContact}>{p.open === 'contact' ? 'Свернуть контакт' : `Связаться · ${short}`}</button>;
  if (h.state === 'new') {
    return <>{contactBtn}{detail}{a.untouched_days ? <span className="stale">не просмотрено {a.untouched_days} {plural(a.untouched_days, ['день', 'дня', 'дней'])}</span> : null}</>;
  }
  return <>{contactBtn}{detail}{closeBtn}{who}</>;
}
