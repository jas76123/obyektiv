import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Frame } from '@/contract';
import { IMAGES } from './images';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEMO_DIR = path.resolve(HERE, '../../../data/demo');

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  if (!head) return [];
  return body
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function read(name: string): string {
  return fs.readFileSync(path.join(DEMO_DIR, name), 'utf-8');
}

export interface DemoCamera { camera_id: string; zone: string; description: string }
export function demoCameras(): DemoCamera[] {
  return parseCsv(read('cameras.csv')) as unknown as DemoCamera[];
}

export interface CatalogEntry { pattern: string; classes: Record<string, number>; people: number; days: number; comment: string }
export function demoCatalog(): CatalogEntry[] {
  return parseCsv(read('catalog.csv')).map((r) => ({
    pattern: (r.work_pattern ?? '').toLowerCase(),
    classes: Object.fromEntries(
      (r.required_classes ?? '').split(';').filter(Boolean).map((chunk) => {
        const [name, count] = chunk.split(':');
        return [(name ?? '').trim(), Number(count ?? 1)];
      }),
    ),
    people: Number(r.min_people ?? 0),
    days: Number(r.required_days ?? 0),
    comment: r.comment ?? '',
  }));
}

export function demoHolidays(): Array<{ day: string; reason: string }> {
  return parseCsv(read('holidays.csv')).map((r) => ({ day: r.day ?? '', reason: r.reason ?? '' }));
}

/** 451 синтетический кадр «Северного»: пиксели, кадр 1920×1080. */
export function demoFrames(): Frame[] {
  const json = JSON.parse(read('detections.json')) as { frames: Array<Omit<Frame, 'image_path' | 'width' | 'height'>> };
  return json.frames.map((f) => ({ ...f, image_path: IMAGES[f.frame_id] ?? null, width: 1920, height: 1080 }));
}

export interface AcceptanceRow { id: string; status: string; days: number; confirmed: number }
/** Приёмочная таблица «Ожидаемый результат» из data/demo/README.md. */
export function demoAcceptance(): AcceptanceRow[] {
  const out: AcceptanceRow[] = [];
  for (const line of read('README.md').split('\n')) {
    const cells = line.split('|').map((c) => c.trim().replace(/\*/g, ''));
    const id = cells[1] ?? '';
    if (!/^W-\d+$/.test(id)) continue;
    const status = /`([a-z_]+)/.exec(cells[4] ?? '')?.[1];
    if (!status) continue;
    out.push({ id, status, days: Number(cells[5]), confirmed: Number(cells[6]) });
  }
  return out;
}
