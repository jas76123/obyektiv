'use client';
import { useState } from 'react';
import type { Frame } from '@/contract';
import { classLabel } from '@/contract/labels';
import { visibleDetections, boxStyle } from './frameGeometry';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function src(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${BASE_PATH}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Кадр с рамками. Есть картинка — JPG и рамки поверх; нет — схематичная площадка с меткой «демо-кадр». */
export function FrameView({ frame, labeled, caption }: { frame: Frame | null; labeled?: boolean; caption?: string }) {
  const [broken, setBroken] = useState(false);
  if (!frame) {
    return <div className="fv fv-none"><span className="fv-msg">{caption ?? 'НАБЛЮДЕНИЙ НЕТ'}</span></div>;
  }
  const hasImage = Boolean(frame.image_path) && !broken;
  const boxes = visibleDetections(frame);
  return (
    <div className="fv" style={{ aspectRatio: `${frame.width} / ${frame.height}` }}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="fv-img" src={src(frame.image_path!)} alt="Кадр камеры" onError={() => setBroken(true)} />
      ) : (
        <>
          <svg className="fv-scene" viewBox="0 0 220 124" preserveAspectRatio="none" aria-hidden="true">
            <rect width="220" height="124" fill="var(--sky)" />
            <path d="M0 74 L220 66 L220 124 L0 124 Z" fill="var(--soil)" />
            <path d="M0 74 L220 66" stroke="var(--rule)" strokeWidth="1" fill="none" />
          </svg>
          <span className="fv-demo">ДЕМО-КАДР · СИНТЕТИКА</span>
        </>
      )}
      {boxes.map((d, i) => (
        <span key={i} className={`bx${d.class === 'person' ? ' person' : ''}${d.off_stage ? ' off' : ''}`} style={boxStyle(d, frame)}>
          {labeled ? <b>{classLabel(d.class)} {d.confidence.toFixed(2)}{d.off_stage ? ' · НЕ ПО ЭТАПУ' : ''}</b> : null}
        </span>
      ))}
      {boxes.length === 0 ? <span className="fv-msg bad">ТЕХНИКА НЕ ОБНАРУЖЕНА</span> : null}
    </div>
  );
}
