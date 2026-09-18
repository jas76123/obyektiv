'use client';
import Link from 'next/link';
import { api } from '@/api/api';
import { useLoad } from '@/components/useLoad';
import { ErrorBox } from '@/components/ErrorBox';
import { Gantt } from './Gantt';

const CAM_STATE = { ok: 'ok', gap: 'gap', off: 'off' } as const;

/** Блок объекта: шапка, камеры, прогноз сроков, Гант (мокап 0.4, objectBlock(), строки 914–927). */
export function ObjectBlock({ objectId, resolved }: { objectId: string; resolved: Record<string, string> }) {
  const { data, error, loading, reload } = useLoad(() => api.gantt(objectId), [objectId]);
  if (loading) return <div className="loading">ЗАГРУЗКА ОБЪЕКТА…</div>;
  if (error || !data) return <ErrorBox error={error} onRetry={reload} />;
  const o = data.object;
  const c = data.counts;
  return (
    <>
      <div className="objhead">
        <div>
          <h2>{o.name}</h2>
          <div className="meta">{o.stage.toUpperCase()} · {o.cameras_count ? `${o.cameras_count} КАМЕРЫ` : 'КАМЕР НЕТ'} · {o.zones_label.toUpperCase()}</div>
        </div>
        <div className="counts">
          <span><b>{c.total}</b> работ</span><span><b className="ok">{c.ok}</b> подтверждены</span><span><b className="warn">{c.warn}</b> не подтверждены</span>
          <span><b className="bad">{c.bad}</b> расхождение</span><span><b>{c.none}</b> не проверяются</span>
          <Link className="act" href={`/settings/?object=${encodeURIComponent(o.id)}`}>Настройка объекта</Link>
        </div>
      </div>
      {data.cameras.length ? (
        <div className="camline">
          <span className="sortlbl">Камеры</span>
          {data.cameras.map((cam) => (
            <Link key={cam.id} className={`cst ${CAM_STATE[cam.state]}`} href={`/camera/?id=${encodeURIComponent(cam.id)}`}><i />{cam.id} · {cam.last_frame}</Link>
          ))}
        </div>
      ) : null}
      {data.forecast.text ? <div className="fcline">{data.forecast.text}</div> : null}
      {o.cameras_count === 0 ? (
        <div className="verdict" style={{ marginBottom: 14 }}><b>Камеры не подключены.</b> Зоны заданы диапазонами пикетажа, график загружен, сверка не идёт: план-факт ниже показывает только заявленное.</div>
      ) : null}
      <Gantt data={data} resolved={resolved} />
    </>
  );
}
