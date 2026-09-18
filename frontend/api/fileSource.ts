import { fileKey } from '@/lib/fileKey';
import { getJson, type FetchFn, type Source } from './source';

export function makeFileSource(fetchFn: FetchFn, basePath: string): Source {
  const get = (rel: string) => getJson(fetchFn, `${basePath}/data/${rel}`);
  return {
    portfolio: () => get('portfolio.json'),
    gantt: (id) => get(`gantt/${fileKey(id)}.json`),
    review: (id) => get(`review/${fileKey(id)}.json`),
    frame: (cameraId, date) => get(`frame/${fileKey(cameraId)}_${date}.json`),
    settings: (id) => get(`settings/${fileKey(id)}.json`),
    uploadPlan: async () => null,
  };
}
