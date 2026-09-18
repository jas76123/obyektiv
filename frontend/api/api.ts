import type { ZodType, ZodTypeDef } from 'zod';
import {
  PortfolioSchema, ObjectGanttSchema, WorkReviewSchema, CameraShiftSchema, SettingsSchema, PlanUploadResultSchema,
  type PlanUpload,
} from '@/contract';
import { ApiError, type Source } from './source';
import { makeFileSource } from './fileSource';
import { makeHttpSource } from './httpSource';

/** Проверка ответа схемой контракта: расхождение называет поле, а не роняет экран. */
export function parseWith<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown, where: string): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const details = r.error.issues.slice(0, 12).map((i) => `${i.path.join('.') || '(корень)'}: ${i.message}`);
  throw new ApiError('schema', `Ответ не совпал с контрактом: ${where}`, details);
}

export function makeApi(source: Source) {
  return {
    portfolio: async () => parseWith(PortfolioSchema, await source.portfolio(), 'GET /api/portfolio'),
    gantt: async (id: string) => parseWith(ObjectGanttSchema, await source.gantt(id), `GET /api/objects/${id}/gantt`),
    review: async (id: string) => parseWith(WorkReviewSchema, await source.review(id), `GET /api/works/${id}/review`),
    frame: async (cameraId: string, date: string) => parseWith(CameraShiftSchema, await source.frame(cameraId, date), `GET /api/cameras/${cameraId}/frame`),
    settings: async (id: string) => parseWith(SettingsSchema, await source.settings(id), 'GET /api/settings'),
    uploadPlan: async (body: PlanUpload) => {
      const raw = await source.uploadPlan(body);
      return raw === null ? null : parseWith(PlanUploadResultSchema, raw, 'POST /api/plan');
    },
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const API_MODE: 'file' | 'http' = API_BASE ? 'http' : 'file';

const browserFetch: typeof fetch = (url, init) => fetch(url, init);
export const api = makeApi(API_BASE ? makeHttpSource(browserFetch, API_BASE) : makeFileSource(browserFetch, BASE_PATH));
