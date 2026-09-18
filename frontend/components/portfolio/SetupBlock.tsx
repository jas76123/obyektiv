import Link from 'next/link';
import type { Alert } from '@/contract';
import { AlertCard } from './AlertCard';

/** Блок «требует настройки» — задачи kind=setup, не претензия к подрядчику (мокап 0.4, строки 1029–1041). */
export function SetupBlock({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="setupblock">
      <p className="eyebrow">ТРЕБУЕТ НАСТРОЙКИ · {alerts.length} · НЕ ПРЕТЕНЗИЯ К ПОДРЯДЧИКУ</p>
      <div className="feed">
        {alerts.map((a) => (
          <AlertCard
            key={a.id}
            alert={a}
            footer={
              <>
                <Link className="act primary" href={`/settings/?object=${encodeURIComponent(a.object_id)}`}>Описать признаки</Link>
                <Link className="act" href={`/work/?id=${encodeURIComponent(a.work_id)}`}>Подробно</Link>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
