import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Alert, Tag, Tone } from '@/contract';
import { StatusChip } from '@/components/StatusChip';
import { Tags } from '@/components/Tags';
import { Triad } from '@/components/Triad';
import { FrameView } from '@/components/FrameView';

const STRIPE_CLASS: Partial<Record<Tone, string>> = { warn: 'warn', ok: 'ok', grey: 'acc' };

/** Formats the alert path with optional suffix for setup alerts. */
export function formatAlertPath(alert: Alert): string {
  const basePath = `${alert.object_name} · ${alert.zone} · ${alert.contractor}`;
  if (alert.kind === 'setup') {
    return `${basePath} · закрыто на ${alert.triad.declared.percent} %`;
  }
  return basePath;
}

/** Карточка замечания в ленте (мокап 0.4, строки 1013–1025). footer и panels заполняет задача 7. */
export function AlertCard({ alert, extraTag, footer, panels }: { alert: Alert; extraTag?: Tag | null; footer?: ReactNode; panels?: ReactNode }) {
  const stripeCls = STRIPE_CLASS[alert.tone];
  const frame = <FrameView frame={alert.evidence.frame} caption={alert.evidence.label} />;
  const cameraHref = alert.evidence.camera_id && alert.evidence.date
    ? `/camera/?id=${encodeURIComponent(alert.evidence.camera_id)}&date=${encodeURIComponent(alert.evidence.date)}`
    : null;
  return (
    <div className={`alert${alert.kind === 'setup' ? ' setup' : ''}`}>
      <span className={`stripe${stripeCls ? ` ${stripeCls}` : ''}`} />
      <div className="abody">
        <div className="ahead">
          <StatusChip status={alert.status} reason={alert.status_reason} />
          <span className="atitle">{alert.work_name}</span>
          <Tags tags={alert.tags} extra={extraTag} />
        </div>
        <span className="apath">{formatAlertPath(alert)}</span>
        <div className="arow">
          <p className="averdict">{alert.verdict}</p>
          <Triad triad={alert.triad} tone={alert.tone} />
        </div>
        <div className="afoot">
          {footer ?? <Link className="act" href={`/work/?id=${encodeURIComponent(alert.work_id)}`}>Подробно</Link>}
        </div>
      </div>
      <div className="aside">
        <span className="evlabel">{alert.evidence.label}</span>
        {cameraHref ? <Link href={cameraHref}>{frame}</Link> : frame}
        <span className="evlabel">{alert.evidence.sub}</span>
      </div>
      {panels}
    </div>
  );
}
