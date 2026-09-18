type Maybe = string | null | undefined;

export function telLink(phone: Maybe): string | null {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

export function telegramLink(handle: Maybe, text: string): string | null {
  const nick = (handle ?? '').replace(/^@/, '').trim();
  return nick ? `https://t.me/${nick}?text=${encodeURIComponent(text)}` : null;
}

/** У Макса нет подтверждённой ссылки с готовым текстом: открывается чат, текст копируется в буфер (см. ContactPanel). */
export function maxLink(handle: Maybe): string | null {
  const nick = (handle ?? '').replace(/^@/, '').trim();
  return nick ? `https://max.ru/${nick}` : null;
}

export function mailLink(email: Maybe, subject: string, text: string): string | null {
  const to = (email ?? '').trim();
  return to ? `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null;
}
