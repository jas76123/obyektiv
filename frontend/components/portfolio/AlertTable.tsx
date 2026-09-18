import type { Alert, Contact } from '@/contract';
import { manualTag, type Handling } from '@/store/handling';
import { StatusChip } from '@/components/StatusChip';
import { Tags } from '@/components/Tags';
import type { SortKey } from './feedLogic';

const COLUMNS: Array<{ key: SortKey | null; label: string }> = [
  { key: 'sev', label: 'Острота' },
  { key: 'obj', label: 'Объект' },
  { key: null, label: 'Зона' },
  { key: null, label: 'Работа' },
  { key: 'contr', label: 'Подрядчик' },
  { key: null, label: 'План' },
  { key: null, label: 'Заявлено' },
  { key: 'gap', label: 'Подтв. наблюдением' },
  { key: 'stale', label: 'Без реакции' },
  { key: null, label: 'Кому звонить' },
];
/** Направление стрелки/aria-sort сортируемых колонок: obj и contr — по возрастанию, остальные — по убыванию. */
const ASC: Partial<Record<SortKey, boolean>> = { obj: true, contr: true };

/** Табличный вид ленты замечаний (мокап 0.4, строки 991–1010). */
export function AlertTable({ alerts, handlingOf, contactOf, sort, onSort }: {
  alerts: Alert[];
  handlingOf: (a: Alert) => Handling;
  contactOf: (a: Alert) => Contact | null;
  sort: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <div className="tbl">
      <table>
        <tbody>
          <tr>
            {COLUMNS.map((c, i) => c.key ? (
              <th
                key={i}
                onClick={() => onSort(c.key!)}
                aria-sort={sort === c.key ? (ASC[c.key] ? 'ascending' : 'descending') : undefined}
              >
                {c.label}
                {sort === c.key ? <span className="arrow">{ASC[c.key] ? '▲' : '▼'}</span> : null}
              </th>
            ) : (
              <th key={i}>{c.label}</th>
            ))}
          </tr>
          {alerts.map((a) => {
            const h = handlingOf(a);
            const contact = contactOf(a);
            const cnf = a.triad.confirmed;
            const cnfCls = a.tone === 'bad' ? 'bad' : a.tone === 'warn' ? 'warn' : '';
            const extra = manualTag(h);
            return (
              <tr key={a.id}>
                <td>
                  <StatusChip status={a.status} reason={a.status_reason} />
                  {a.tags.length || extra ? <br /> : null}
                  <Tags tags={a.tags} extra={extra} />
                </td>
                <td className="cellobj">{a.object_short}</td>
                <td className="num">{a.zone}</td>
                <td>{a.work_name}</td>
                <td className="num">{a.contractor}</td>
                <td className="num">
                  <span className="minibar plan"><i style={{ width: `${a.triad.plan_today}%` }} /></span> {a.triad.plan_today} %
                </td>
                <td className="num">
                  <span className="minibar rep"><i style={{ width: `${a.triad.declared.percent}%` }} /></span> {a.triad.declared.percent} %
                </td>
                <td className="num">
                  <span className={`minibar cnf${cnfCls ? ` ${cnfCls}` : ''}`}><i style={{ width: `${cnf ?? 0}%` }} /></span>{' '}
                  {cnf === null ? '—' : `${cnf} %`}{' '}
                  <em style={{ color: 'var(--faint)', fontStyle: 'normal' }}>
                    {a.triad.elapsed_days ? `${a.triad.confirmed_days}/${a.triad.elapsed_days} дн` : '—'}
                  </em>
                </td>
                <td className="num" style={{ color: a.untouched_days ? 'var(--bad)' : 'var(--faint)' }}>
                  {a.untouched_days ? `${a.untouched_days} сут` : '—'}
                </td>
                <td className="num">
                  {contact ? (
                    <>{contact.name}<br /><span style={{ color: 'var(--faint)' }}>{contact.phone}</span></>
                  ) : (
                    <span style={{ color: 'var(--warn)' }}>не указан</span>
                  )}
                  {h.state === 'contacted' ? <><br /><span style={{ color: 'var(--blue)' }}>запрос отправлен</span></> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
