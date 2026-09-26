import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  LeaderboardResponse, ObjectsResponse, ScheduleResponse, ShotsStatusResponse,
  type Leaderboard, type Objects, type Schedule, type ScheduleTask, type ShotsStatus,
} from '../contract/schemas';
import { demo } from '../demo';
import { problemPollInterval } from '../lib/poll';
import { queryClient } from './queryClient';
import { loadSettings, serverBase } from './settings';
import { cacheFrom, chooseSource, fetchJson, stampSource, type SourceTag, type Sourced } from './source';

async function load<T>(key: unknown[], path: string, schema: Parameters<typeof fetchJson>[1], demoData: T): Promise<Sourced<T>> {
  const s = await loadSettings();
  const base = serverBase(s);
  const stored = queryClient.getQueryData<Sourced<T>>(key);
  // «Кэш» — это последний успешный ответ сервера, и он живёт, пока сервер
  // недоступен, сколько бы раз подряд он ни падал (source 'cache' сам по
  // себе уже происходит от настоящего ответа сервера — демо в кэш не
  // пересохраняется). При «только демо-данные» кэш не отдаём вообще, чтобы
  // демо оставалось демо. `stampSource` ниже проставляет время того ответа
  // (`at`) для шапки «данные на HH:MM».
  const cached = cacheFrom(stored, s.demoOnly);
  return stampSource(
    await chooseSource<T>({
      server: base ? () => fetchJson(base + path, schema) as Promise<T> : null,
      cached,
      demo: demoData,
    }),
    stored,
  );
}

export const keys = {
  objects: () => ['objects'] as const,
  schedule: (o: string, b: string, d: string) => ['schedule', o, b, d] as const,
  leaderboard: (o: string) => ['leaderboard', o] as const,
  shotStatuses: (uuids: string[]) => ['shot-statuses', uuids.join(',')] as const,
};

export function useObjects() {
  return useQuery({
    queryKey: keys.objects(),
    refetchInterval: (q) => problemPollInterval(q.state.data),
    queryFn: () => load<Objects>([...keys.objects()], '/api/foreman/objects', ObjectsResponse, demo.objects),
  });
}

export function useSchedule(objectId: string | null, brigadeId: string | null, date: string) {
  return useQuery({
    queryKey: keys.schedule(objectId ?? '', brigadeId ?? '', date),
    enabled: !!objectId && !!brigadeId,
    refetchInterval: (q) => problemPollInterval(q.state.data),
    queryFn: () => load<Schedule>(
      [...keys.schedule(objectId!, brigadeId!, date)],
      `/api/foreman/object/${encodeURIComponent(objectId!)}/schedule?brigade_id=${encodeURIComponent(brigadeId!)}&date=${date}`,
      ScheduleResponse,
      { ...demo.schedule, date },
    ),
  });
}

/** Расписания нескольких бригад объекта — для имён работ в «Что сделали другие бригады». */
export function useSchedules(objectId: string | null, brigadeIds: string[], date: string): Record<string, ScheduleTask[]> {
  const results = useQueries({
    queries: brigadeIds.map((b) => ({
      queryKey: keys.schedule(objectId ?? '', b, date),
      enabled: !!objectId,
      queryFn: () => load<Schedule>(
        [...keys.schedule(objectId!, b, date)],
        `/api/foreman/object/${encodeURIComponent(objectId!)}/schedule?brigade_id=${encodeURIComponent(b)}&date=${date}`,
        ScheduleResponse,
        { ...demo.schedule, date },
      ),
    })),
  });
  const stamp = results.map((r) => r.dataUpdatedAt).join(',');
  const ids = brigadeIds.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- results новый на каждый рендер, зависим от штампов
  return useMemo(() => Object.fromEntries(brigadeIds.map((b, i) => [b, results[i]?.data?.data.tasks ?? []])), [ids, stamp]);
}

export function useLeaderboard(objectId: string | null) {
  return useQuery({
    queryKey: keys.leaderboard(objectId ?? ''),
    enabled: !!objectId,
    refetchInterval: (q) => problemPollInterval(q.state.data),
    queryFn: () => load<Leaderboard>(
      [...keys.leaderboard(objectId!)],
      `/api/foreman/leaderboard?object_id=${encodeURIComponent(objectId!)}`,
      LeaderboardResponse,
      // demo/*.json теряет буквенные типы enum'ов при импорте — прогоняем через схему.
      LeaderboardResponse.parse(demo.leaderboard),
    ),
  });
}

/** Статусы фото: раз в 30 с, пока есть что спрашивать. Демо-ответ только для демо-uuid. */
export function useShotStatuses(uuids: string[]) {
  return useQuery({
    queryKey: keys.shotStatuses(uuids),
    enabled: uuids.length > 0,
    refetchInterval: 30_000,
    queryFn: () => load<ShotsStatus>(
      [...keys.shotStatuses(uuids)],
      `/api/foreman/shots/status?uuids=${encodeURIComponent(uuids.join(','))}`,
      ShotsStatusResponse,
      // demo/*.json теряет буквенные типы enum'ов при импорте — прогоняем через схему.
      { shots: ShotsStatusResponse.parse(demo.shotsStatus).shots.filter((s) => uuids.includes(s.local_uuid)) },
    ),
  });
}

/**
 * Наряды прошедших дней из кэша запросов (persister держит их на диске неделю): дата → работы.
 * Нужны «Отчётам», чтобы поставить «не принято» работе, по которой в тот день не снимали
 * (спека 26.09 «work_status» §3.5). Кэш не реактивен, поэтому пересчёт привязан к штампу
 * сегодняшнего наряда (`current.stamp` = dataUpdatedAt) и к смене даты. Демо-наряды берём
 * только когда и сегодняшний наряд — демо: иначе демо-дни смешались бы с настоящими.
 */
export function usePastSchedules(
  objectId: string | null,
  brigadeId: string | null,
  today: string,
  current: { source?: SourceTag; stamp: number },
): Record<string, ScheduleTask[]> {
  const { source, stamp } = current;
  return useMemo(() => {
    if (!objectId || !brigadeId) return {};
    const out: Record<string, ScheduleTask[]> = {};
    for (const [key, data] of queryClient.getQueriesData<Sourced<Schedule>>({ queryKey: ['schedule', objectId, brigadeId] })) {
      const date = key[3];
      if (typeof date !== 'string' || date >= today || !data) continue;
      if (data.source === 'demo' && source !== 'demo') continue;
      out[date] = data.data.tasks;
    }
    return out;
  }, [objectId, brigadeId, today, source, stamp]);
}
