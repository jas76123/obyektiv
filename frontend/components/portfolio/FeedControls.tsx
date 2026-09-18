import type { FeedState, SortKey } from './feedLogic';

const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['sev', 'по остроте'],
  ['obj', 'по объекту'],
  ['stale', 'по времени без реакции'],
  ['contr', 'по подрядчику'],
  ['gap', 'по разрыву «заявлено — подтверждено»'],
];

/** Панель сортировки, переключателя вида и фильтров ленты (мокап 0.4, строки 976–988). */
export function FeedControls({ state, view, counts, shown, scopeLabel, onState, onView }: {
  state: FeedState;
  view: 'feed' | 'table';
  counts: { base: number; onlyNew: number; onlyBad: number; closed: number };
  shown: number;
  scopeLabel: string;
  onState: (s: FeedState) => void;
  onView: (v: 'feed' | 'table') => void;
}) {
  return (
    <div className="sortbar">
      <div className="viewtog">
        <button type="button" aria-pressed={view === 'feed'} onClick={() => onView('feed')}>Лента</button>
        <button type="button" aria-pressed={view === 'table'} onClick={() => onView('table')}>Таблица</button>
      </div>
      <span className="sortlbl">Сортировка</span>
      <select value={state.sort} onChange={(e) => onState({ ...state, sort: e.target.value as SortKey })}>
        {SORT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <span className="sortlbl" style={{ marginLeft: 6 }}>Показать</span>
      <button className="fbtn" type="button" aria-pressed={state.onlyNew} onClick={() => onState({ ...state, onlyNew: !state.onlyNew })}>никто не открывал · {counts.onlyNew}</button>
      <button className="fbtn" type="button" aria-pressed={state.onlyBad} onClick={() => onState({ ...state, onlyBad: !state.onlyBad })}>только «ничего не обнаружено» · {counts.onlyBad}</button>
      <button className="fbtn" type="button" aria-pressed={state.showClosed} onClick={() => onState({ ...state, showClosed: !state.showClosed })}>показать закрытые · {counts.closed}</button>
      <span className="count">
        показано {shown} из {counts.base} · {scopeLabel}
        {state.onlyNew ? ' · только новые' : ''}
        {state.onlyBad ? ' · только красные' : ''}
        {state.showClosed ? ' · с закрытыми' : ''}
      </span>
    </div>
  );
}
