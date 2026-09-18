import { ApiError, getJson, type FetchFn, type Source } from './source';

export function makeHttpSource(fetchFn: FetchFn, apiBase: string): Source {
  const base = apiBase.replace(/\/$/, '');
  const get = (rel: string) => getJson(fetchFn, `${base}/api/${rel}`);
  const enc = encodeURIComponent;
  return {
    portfolio: () => get('portfolio'),
    gantt: (id) => get(`objects/${enc(id)}/gantt`),
    review: (id) => get(`works/${enc(id)}/review`),
    frame: (cameraId, date) => get(`cameras/${enc(cameraId)}/frame?date=${enc(date)}`),
    settings: (id) => get(`settings?object=${enc(id)}`),
    uploadPlan: async (body) => {
      try {
        return await getJson(fetchFn, `${base}/api/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'not_found') return null;
        if (e instanceof ApiError && e.kind === 'http' && e.message.startsWith('Ошибка 405')) return null;
        throw e;
      }
    },
  };
}
