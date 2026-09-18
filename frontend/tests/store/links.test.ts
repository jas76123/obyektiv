import { describe, it, expect } from 'vitest';
import { telLink, telegramLink, maxLink, mailLink } from '@/store/links';

describe('ссылки каналов', () => {
  it('телефон: только цифры и плюс', () => {
    expect(telLink('+7 917 204-11-86')).toBe('tel:+79172041186');
    expect(telLink(null)).toBeNull();
  });
  it('Telegram: ник без @ и готовый текст', () => {
    expect(telegramLink('@safin_rr', 'Добрый день')).toBe('https://t.me/safin_rr?text=' + encodeURIComponent('Добрый день'));
    expect(telegramLink('', 'x')).toBeNull();
  });
  it('Макс: чат без текста (текст копируется в буфер)', () => {
    expect(maxLink('safin_rr')).toBe('https://max.ru/safin_rr');
    expect(maxLink(undefined)).toBeNull();
  });
  it('почта: тема и тело', () => {
    expect(mailLink('a@b.ru', 'Тема', 'Текст')).toBe('mailto:a@b.ru?subject=' + encodeURIComponent('Тема') + '&body=' + encodeURIComponent('Текст'));
  });
});
