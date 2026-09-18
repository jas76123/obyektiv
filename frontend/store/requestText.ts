import type { Alert } from '@/contract';
import { addWorkdays, fmt, fmtDayMonth } from '@/lib/format';

/** Запрос подрядчику собирается из фактов карточки (BR-703). Шаблоны макета 0.4. */
export function buildRequestText(a: Alert, asOf: string): string {
  const head = `${a.object_name}, ${a.zone}, ${a.work_name.toLowerCase()}`;
  const due = fmtDayMonth(addWorkdays(asOf, 2));
  const days = a.triad.elapsed_days ? `${a.triad.confirmed_days} из ${a.triad.elapsed_days}` : '0';
  const s = a.schedule;

  if (a.kind === 'setup')
    return `${head}.\nВид работ закрыт в графике, но не описан в справочнике признаков, поэтому система его не проверяет.\nПрошу приложить фотоотчёт о выполнении для ручной проверки.`;
  if (a.status === 'insufficient')
    return `${head}.\nРабота закрыта в графике на ${a.triad.declared.percent} %, но кадров с камеры зоны за дни этапа недостаточно, чтобы подтвердить или оспорить объём.\nПрошу до ${due} приложить фотоотчёт о выполнении для ручной проверки.`;
  if (a.tone === 'bad')
    return `${head} (${a.work_id}).\nВ графике работа закрыта на ${a.triad.declared.percent} %. По данным видеонаблюдения за период этапа подтверждено ${days} рабочих дней: ожидаемой техники и бригады в зоне не зафиксировано.\nПрошу до ${due} подтвердить объём фотоотчётом с привязкой к осям либо скорректировать факт в графике.`;
  if (a.tags.some((t) => t.kind === 'sched') && s.fact_start && s.forecast_end)
    return `${head}.\nРабота идёт, но началась позже графика: по наблюдению бригада вышла в зону ${fmt(s.fact_start)} при плане ${fmt(s.plan_start)}. Прогноз окончания ${fmt(s.forecast_end)} вместо ${fmt(s.plan_end)}.\nПрошу сообщить причину сдвига и меры по восстановлению графика следующего этапа.`;
  return `${head}.\nТехника в зоне присутствует, но за последние смены не меняет положения, состав бригады ниже нормативного.\nПрошу сообщить причину простоя и срок возобновления работ.`;
}
