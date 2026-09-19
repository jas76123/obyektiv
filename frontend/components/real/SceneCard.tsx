import type { RealScene } from '@/contract';
import { classLabel } from '@/contract/labels';
import { FrameView } from '@/components/FrameView';
import { countsLine, sceneSpan } from './realLogic';

export function SceneCard({ scene }: { scene: RealScene }) {
  return (
    <article className="rs">
      <div className="rs-frame"><FrameView frame={scene.frame} labeled /></div>
      <div className="rs-body">
        <div className="rs-kick">СЦЕНА {scene.scene} · {sceneSpan(scene)}</div>
        <div className="rs-counts">{countsLine(scene.counts)}</div>
        <ul className="rs-items">
          {scene.items.map((it) => (
            <li key={it.track_id}>
              <b>{classLabel(it.class)}</b>
              <span className="rs-meta">трек {it.track_id} · {it.confidence.toFixed(2)} · у модели «{it.model_class}» · {it.frames} кадр.</span>
              <span className={`chip ${it.moved ? 'ok' : 'warn'}`}>{it.moved ? 'ДВИГАЛАСЬ' : 'СТОЯЛА'}</span>
            </li>
          ))}
        </ul>
        <div className="rs-note">«двигалась / стояла» — за время наблюдения в сцене, это не простой</div>
      </div>
    </article>
  );
}
