import type { PortfolioSummary } from '@/contract';
import { plural } from '@/lib/format';

/** Сводная строка портфеля, пять чисел (мокап 0.4, строки 946–958). */
export function SummaryRow({ summary, objectsTotal, scoped }: { summary: PortfolioSummary; objectsTotal: number; scoped: boolean }) {
  const [work, object] = summary.sharpest ? summary.sharpest.text.split(' · ') : [null, null];
  return (
    <div className="portsum">
      <span className="ps"><b>{summary.open_alerts}</b><em>открытых замечаний</em></span>
      <span className="ps"><b className="g">{summary.objects_with_alerts} из {objectsTotal}</b><em>объектов с замечаниями</em></span>
      <span className="ps"><b className="w">{summary.untouched_alerts}</b><em>никто ещё не открывал</em></span>
      <span className="ps"><b className="m">{summary.setup_tasks}</b><em>{plural(summary.setup_tasks, ['задача', 'задачи', 'задач'])} по настройке</em></span>
      <span className="ps">
        <b className="g" style={{ fontSize: 13, lineHeight: 1.3, fontFamily: 'var(--f-ui)', fontWeight: 600 }}>
          {work ?? '—'}
          <br />
          <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{object ?? ''}</span>
        </b>
        <em>самое острое</em>
      </span>
      <i>{scoped ? 'цифры по всему портфелю · лента по объекту' : 'цифры и лента по всему портфелю'}</i>
    </div>
  );
}
