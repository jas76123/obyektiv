'use client';
import { useEffect, useState } from 'react';

/** Параметры адресной строки. При статическом экспорте читаются только в браузере, поэтому до монтирования пусто. */
export function useQuery(): URLSearchParams | null {
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    const read = () => setQ(new URLSearchParams(window.location.search));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  return q;
}
