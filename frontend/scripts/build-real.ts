import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { RawDetectionSchema, RealObservationsSchema } from '@/contract';
import { buildObservations, pivotFrames } from './real/observations';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../public/real');
const jsonPath = path.resolve(process.argv[2] ?? path.join(HERE, '../../data/georgiy/video_detections.json'));
const videoPath = path.resolve(process.argv[3] ?? path.join(HERE, '../../data/georgiy/Video.mp4'));

const parsed = z.array(RawDetectionSchema).safeParse(JSON.parse(fs.readFileSync(jsonPath, 'utf-8')));
if (!parsed.success) {
  const i = parsed.error.issues[0]!;
  console.error(`вход не совпал с форматом: запись ${i.path[0]}, поле ${i.path.slice(1).join('.') || '(вся запись)'}: ${i.message}`);
  process.exit(1);
}
const records = parsed.data;

/** Размер и частота кадров из ролика; ролика или ffprobe нет — оценка по самим детекциям. */
function probe(): { width: number; height: number; fps: number; video: boolean } {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', videoPath], { encoding: 'utf-8' });
    const s = JSON.parse(out).streams[0] as { width: number; height: number; r_frame_rate: string };
    const [num, den] = s.r_frame_rate.split('/').map(Number);
    return { width: s.width, height: s.height, fps: num! / (den || 1), video: true };
  } catch {
    const last = records.reduce((a, b) => (b.frame > a.frame ? b : a), records[0] ?? { frame: 0, time_sec: 0 });
    return {
      width: Math.ceil(Math.max(1, ...records.map((r) => r.bbox[0] + r.bbox[2] / 2))),
      height: Math.ceil(Math.max(1, ...records.map((r) => r.bbox[1] + r.bbox[3] / 2))),
      fps: last.time_sec > 0 ? Math.round(last.frame / last.time_sec) : 30,
      video: false,
    };
  }
}

const info = probe();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const name = (n: number) => `scene-${String(n).padStart(2, '0')}.jpg`;
const made = new Set<number>();
if (info.video) {
  pivotFrames(records).forEach((frame, i) => {
    const n = i + 1;
    try {
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', (frame / info.fps).toFixed(3), '-i', videoPath, '-frames:v', '1', '-q:v', '3', path.join(OUT, 'frames', name(n))]);
      made.add(n);
    } catch (e) {
      console.warn(`кадр сцены ${n} не вырезан: ${String(e).split('\n')[0]}`);
    }
  });
} else {
  console.warn(`ролик или ffprobe недоступны (${videoPath}) — наблюдения без кадров`);
}

const obs = RealObservationsSchema.parse(buildObservations(records, {
  detectionsFile: path.basename(jsonPath),
  videoFile: info.video ? path.basename(videoPath) : null,
  fps: info.fps, width: info.width, height: info.height,
  imagePath: (n) => (made.has(n) ? `/real/frames/${name(n)}` : null),
}));
fs.writeFileSync(path.join(OUT, 'observations.json'), JSON.stringify(obs, null, 1) + '\n', 'utf-8');
console.log(`наблюдения: записей ${obs.source.records}, треков ${obs.source.tracks_kept} из ${obs.source.tracks_total}, сцен ${obs.scenes.length}, кадров ${made.size} → ${path.relative(process.cwd(), OUT)}`);
