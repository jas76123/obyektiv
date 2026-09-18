import type { ObjectCard } from '@/contract';

/** Три полоски объекта (BR-405): план / заявлено / подтверждено. */
export function Bars({ bars }: { bars: ObjectCard['bars'] }) {
  const rows: Array<[string, string, number | null]> = [['план', 'plan', bars.plan_today], ['заявл.', 'rep', bars.declared], ['подтв.', 'cnf', bars.confirmed]];
  return (
    <div className="triad mini">
      {rows.map(([label, cls, v]) => (
        <div className="trow" key={cls}>
          <span className="tlbl">{label}</span>
          <span className={`tbar ${cls}`}><i style={{ width: `${v ?? 0}%` }} /></span>
          <span className="tnum">{v === null ? '—' : v}</span>
        </div>
      ))}
    </div>
  );
}
