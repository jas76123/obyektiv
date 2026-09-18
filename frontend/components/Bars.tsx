import type { ObjectCard, Tone } from '@/contract';

/** Returns the class name for the confirmed bar based on tone. */
export function getConfirmedBarClass(tone?: Tone): string {
  if (tone === 'bad' || tone === 'warn') return tone;
  return '';
}

/** Три полоски объекта (BR-405): план / заявлено / подтверждено. */
export function Bars({ bars, tone }: { bars: ObjectCard['bars']; tone?: Tone }) {
  const rows: Array<[string, string, number | null]> = [['план', 'plan', bars.plan_today], ['заявл.', 'rep', bars.declared], ['подтв.', 'cnf', bars.confirmed]];
  const cnfClass = getConfirmedBarClass(tone);
  return (
    <div className="triad mini">
      {rows.map(([label, cls, v]) => (
        <div className="trow" key={cls}>
          <span className="tlbl">{label}</span>
          <span className={`tbar ${cls}${cls === 'cnf' && cnfClass ? ` ${cnfClass}` : ''}`}><i style={{ width: `${v ?? 0}%` }} /></span>
          <span className="tnum">{v === null ? '—' : v}</span>
        </div>
      ))}
    </div>
  );
}
