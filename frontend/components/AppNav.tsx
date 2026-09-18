'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: Array<[string, string]> = [
  ['/', 'Портфель'],
  ['/work/', 'Разбор работы'],
  ['/camera/', 'Камера'],
  ['/settings/', 'Настройка'],
];

/** Нормализует конечный слэш и решает, активен ли пункт навигации для текущего пути. "/" совпадает только сам с собой. */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  const normalize = (p: string) => (p.endsWith('/') ? p : `${p}/`);
  return normalize(pathname) === normalize(href);
}

/** Верхняя навигация приложения (мокап 0.4): подсвечивает текущий раздел через aria-current. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="appnav">
      {NAV.map(([href, label]) => (
        <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
