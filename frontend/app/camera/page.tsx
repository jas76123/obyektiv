'use client';
import { RealObservationsSchema } from '@/contract';
import { parseWith } from '@/api/api';
import { getJson } from '@/api/source';
import { useLoad } from '@/components/useLoad';
import { ErrorBox } from '@/components/ErrorBox';
import { SceneCard } from '@/components/real/SceneCard';
import { countsLine } from '@/components/real/realLogic';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const URL = `${BASE_PATH}/real/observations.json`;

async function loadReal() {
  return parseWith(RealObservationsSchema, await getJson((u, i) => fetch(u, i), URL), 'GET /real/observations.json');
}

export default function CameraPage() {
  const { data, error, loading, reload } = useLoad(loadReal, []);
  if (loading) return <div className="loading">ЗАГРУЗКА…</div>;
  if (error || !data) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <>
      <h1>Камера</h1>
      <p className="rs-lead">
        Детекции модели на демо-ролике. Сцены ролика играют роль снимков с камеры: по каждой — кадр с рамками и подсчёт техники.
      </p>
      <div className="rs-sum">
        <b>ВСЕГО ПО РОЛИКУ</b> {countsLine(data.summary)}
        <span className="rs-meta"> · треков {data.source.tracks_kept} из {data.source.tracks_total}, записей {data.source.records}, источник {data.source.detections_file}</span>
      </div>
      {data.scenes.length === 0 ? <div className="loading">НАБЛЮДЕНИЙ НЕТ</div> : null}
      <div className="rs-list">{data.scenes.map((s) => <SceneCard key={s.scene} scene={s} />)}</div>
    </>
  );
}
