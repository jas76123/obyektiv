import type { ObjectCard, Tone } from '@/contract';
import { plural } from '@/lib/format';
import { Bars } from '@/components/Bars';

/** Полоса карточек объектов и легенда (мокап 0.4, строки 930–944). */
export function ObjectStrip({ objects, badge, selected, onSelect }: {
  objects: ObjectCard[];
  badge: (id: string) => { count: number; tone: Tone | null };
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="objstrip">
        {objects.map((o) => {
          const b = badge(o.id);
          const badgeEl = o.cameras_count === 0
            ? <span className="badge zero">НЕ ПРОВЕРЯЕТСЯ</span>
            : b.count
              ? <span className={`badge${b.tone !== 'bad' ? ' warn' : ''}`}>⚠ {b.count} {plural(b.count, ['ЗАМЕЧАНИЕ', 'ЗАМЕЧАНИЯ', 'ЗАМЕЧАНИЙ'])}</span>
              : <span className="badge zero">БЕЗ ЗАМЕЧАНИЙ</span>;
          return (
            <button key={o.id} type="button" className={`obj ${o.worst}`} aria-pressed={selected === o.id} onClick={() => onSelect(o.id)}>
              <span className="objtop">
                <span className="objname">{o.short_name}</span>
                {badgeEl}
                <span className="objstage">{o.stage}{o.not_checked_count ? ` · ${o.not_checked_count} не пров.` : ''}</span>
                {o.delay_days !== null && o.cameras_count > 0 ? <span className="objlag">+{o.delay_days} дн к сроку</span> : null}
              </span>
              <Bars bars={o.bars} />
            </button>
          );
        })}
      </div>
      <div className="striplegend">
        <span>Полоска сверху: худшее наблюдение по объекту</span>
        <span>Бейдж: открытых замечаний</span>
        <span><i style={{ background: 'repeating-linear-gradient(135deg,transparent,transparent 2px,var(--rule) 2px,var(--rule) 3px)' }} />план на сегодня, % по всем работам объекта</span>
        <span><i style={{ background: 'var(--faint)' }} />заявлено подрядчиками</span>
        <span><i style={{ background: 'var(--ok)' }} />подтверждено наблюдением · доля рабочих дней с активностью, не объём</span>
        <span>все три по проверяемым работам объекта, взвешены по длительности · с начала работ по сегодня</span>
      </div>
    </>
  );
}
