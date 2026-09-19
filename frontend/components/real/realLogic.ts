import { classLabel } from '@/contract/labels';

const clock = (sec: number) => {
  const s = Math.floor(sec);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
};

export function countsLine(counts: { class: string; count: number }[]): string {
  if (counts.length === 0) return 'техника не обнаружена';
  return counts.map((c) => `${classLabel(c.class)} × ${c.count}`).join(' · ');
}

export function sceneSpan(s: { time_from: number; time_to: number }): string {
  return `${clock(s.time_from)} – ${clock(s.time_to)} · ${(s.time_to - s.time_from).toFixed(1).replace('.', ',')} с`;
}
