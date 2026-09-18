import type { Status, StatusReason, Tone, FactSource } from './common';

export type DisplayStatus = Exclude<Status, 'false_completion'>;

/** DEV_REQUIREMENTS §8 п.1: цвет чипа не зависит от отчётности, поэтому «ложное завершение» = «ничего не обнаружено» + метка rep. */
export function displayStatus(s: Status): DisplayStatus {
  return s === 'false_completion' ? 'nothing_detected' : s;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  in_progress: 'РАБОТА ИДЁТ',
  resources_only: 'ТОЛЬКО РЕСУРСЫ',
  nothing_detected: 'НИЧЕГО НЕ ОБНАРУЖЕНО',
  insufficient: 'НЕДОСТАТОЧНО ДАННЫХ',
  not_checked: 'НЕ ПРОВЕРЯЕТСЯ',
  not_started: 'НЕ НАЧАТА',
  manual_resolved: 'РЕШЕНО ВРУЧНУЮ',
};

export const STATUS_TONE: Record<DisplayStatus, Tone> = {
  in_progress: 'ok',
  resources_only: 'warn',
  nothing_detected: 'bad',
  insufficient: 'grey',
  not_checked: 'grey',
  not_started: 'grey',
  manual_resolved: 'blue',
};

export const REASON_LABEL: Record<StatusReason, string> = {
  no_catalog: 'НЕТ В СПРАВОЧНИКЕ',
  no_observable: 'НЕТ ВИДИМЫХ ПРИЗНАКОВ',
  no_camera: 'НЕТ КАМЕРЫ НА ЗОНЕ',
  no_frames: 'КАДРОВ НЕ БЫЛО',
};

/** Коды классов: ТЗ организаторов, таблица ML-03 и демо-набор. */
export const CLASS_LABEL: Record<string, string> = {
  excavator: 'экскаватор',
  dump_truck: 'самосвал',
  truck: 'грузовик',
  bulldozer: 'бульдозер',
  roller: 'каток',
  truck_crane: 'автокран',
  crane: 'кран',
  crane_manipulator: 'кран-манипулятор',
  concrete_mixer: 'бетоносмеситель',
  mixer_truck: 'бетоносмеситель',
  concrete_pump: 'бетононасос',
  loader: 'погрузчик',
  person: 'человек',
  other: 'другая техника',
};
export function classLabel(code: string): string {
  return CLASS_LABEL[code] ?? code;
}

export const FACT_SOURCE_LABEL: Record<FactSource, string> = {
  plan_column: 'график',
  weekly_report: 'недельный отчёт',
  ks2: 'КС-2',
  manual: 'вручную',
};

/** Четыре исхода (BR-705). resolves: работа уходит в «решено вручную» и из счётчиков. */
export const OUTCOMES = [
  { code: 'held', label: 'Подтвердилось · к удержанию по КС-2', tag: 'УДЕРЖАНИЕ ПО КС-2', resolves: false },
  { code: 'explained', label: 'Объяснено подрядчиком', tag: 'ОБЪЯСНЕНО ПОДРЯДЧИКОМ', resolves: true },
  { code: 'false_alarm', label: 'Ложное срабатывание · в модель', tag: 'ЛОЖНОЕ СРАБАТЫВАНИЕ', resolves: true },
  { code: 'escalated', label: 'Нет ответа · эскалация', tag: 'ЭСКАЛАЦИЯ', resolves: false },
] as const;
export type OutcomeCode = (typeof OUTCOMES)[number]['code'];
