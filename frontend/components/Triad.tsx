import type { Triad as TriadData, Tone } from '@/contract';
import { FACT_SOURCE_LABEL } from '@/contract/labels';
import { fmt } from '@/lib/format';

/** Подпись под «заявлено»: кто, когда и откуда; пустые поля не показываются. */
export function declaredNote(d: TriadData['declared']): string {
  return [d.author, d.report_date ? fmt(d.report_date) : null, d.fact_source ? FACT_SOURCE_LABEL[d.fact_source] : null].filter(Boolean).join(' · ');
}

export function Triad({ triad, tone, mini }: { triad: TriadData; tone?: Tone; mini?: boolean }) {
  const cls = tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : '';
  const cnf = triad.confirmed;
  const note = declaredNote(triad.declared);
  return (
    <div className={`triad${mini ? ' mini' : ''}`}>
      <div className="trow"><span className="tlbl">План на сегодня</span><span className="tbar plan"><i style={{ width: `${triad.plan_today}%` }} /></span><span className="tnum">{triad.plan_today} %</span></div>
      <div className="trow"><span className="tlbl">Заявлено</span><span className="tbar rep"><i style={{ width: `${triad.declared.percent}%` }} /></span><span className="tnum">{triad.declared.percent} %</span></div>
      {note && !mini ? <span className="tdays">{note}</span> : null}
      <div className="trow"><span className="tlbl">Подтверждено наблюдением</span><span className={`tbar cnf ${cls}`}><i style={{ width: `${cnf ?? 0}%` }} /></span><span className="tnum">{cnf === null ? '—' : `${cnf} %`}</span></div>
      <span className="tdays">{triad.note}</span>
    </div>
  );
}
