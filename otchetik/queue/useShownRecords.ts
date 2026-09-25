import { useMemo } from 'react';
import { demoShots } from '../demo';
import { newRecord, type ShotRecord } from './types';
import { useQueue } from './useQueue';

/**
 * Записи для «Сегодня» и «Отчётов» из одного места, чтобы экраны не расходились.
 * Демо-режим без своих фото: показываем демо-записи (статусы для них отдаёт
 * demo/shots-status.json), после первого реального фото демо исчезает с обоих экранов.
 */
export function useShownRecords(isDemo: boolean): { records: ShotRecord[]; shown: ShotRecord[]; pending: number; refresh: () => Promise<void> } {
  const { records, pending, refresh } = useQueue(7);
  const shown = useMemo(() => (records.length === 0 && isDemo
    ? demoShots(new Date()).map((d) => ({ ...newRecord({ ...d, geo: null, file_path: '' }), status: 'uploaded' as const }))
    : records), [records, isDemo]);
  return { records, shown, pending, refresh };
}
