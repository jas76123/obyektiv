import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PortfolioSchema, ObjectGanttSchema, WorkReviewSchema, CameraShiftSchema, SettingsSchema } from '@/contract';
import { fileKey } from '@/lib/fileKey';
import { OBJECTS, OBJ_ORDER } from './seed';
import { buildPortfolio } from './build/portfolio';
import { buildGantt } from './build/gantt';
import { buildReview } from './build/review';
import { buildFrameShift, cameraDates } from './build/frame';
import { buildSettings } from './build/settings';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data');

function write(rel: string, data: unknown): void {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n', 'utf-8');
}

// Папка целиком генерируется этим скриптом, поэтому пересоздаётся с нуля.
fs.rmSync(OUT, { recursive: true, force: true });

let files = 0;
write('portfolio.json', PortfolioSchema.parse(buildPortfolio())); files++;
for (const id of OBJ_ORDER) {
  write(`gantt/${fileKey(id)}.json`, ObjectGanttSchema.parse(buildGantt(id))); files++;
  write(`settings/${fileKey(id)}.json`, SettingsSchema.parse(buildSettings(id))); files++;
  for (const wid of OBJECTS[id]!.order) { write(`review/${fileKey(wid)}.json`, WorkReviewSchema.parse(buildReview(id, wid))); files++; }
}
for (const [cam, dates] of cameraDates()) {
  for (const d of dates) { write(`frame/${fileKey(cam)}_${d}.json`, CameraShiftSchema.parse(buildFrameShift(cam, d))); files++; }
}
console.log(`заглушки: ${files} файлов → ${path.relative(process.cwd(), OUT)}`);
