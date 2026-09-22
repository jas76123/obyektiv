import { useQuery } from '@tanstack/react-query';
import {
  LeaderboardResponse, ObjectsResponse, ScheduleResponse, ShotsStatusResponse,
  type Leaderboard, type Objects, type Schedule, type ShotsStatus,
} from '../contract/schemas';
import { demo } from '../demo';
import { queryClient } from './queryClient';
import { loadSettings, serverBase } from './settings';
import { chooseSource, fetchJson, type Sourced } from './source';

async function load<T>(key: unknown[], path: string, schema: Parameters<typeof fetchJson>[1], demoData: T): Promise<Sourced<T>> {
  const s = await loadSettings();
  const base = serverBase(s);
  const stored = queryClient.getQueryData<Sourced<T>>(key);
  // «Кэш» — это только предыдущий успешный ответ сервера. Если раньше уже
  // показывали демо (сервер был недоступен), это не кэш: иначе повторный
  // показ демо-данных подписывался бы как «данные на HH:MM». А при
  // «только демо-данные» кэш вообще не передаём, чтобы демо было демо.
  const cached = !s.demoOnly && stored?.source === 'server' ? stored.data : undefined;
  return chooseSource<T>({
    server: base ? () => fetchJson(base + path, schema) as Promise<T> : null,
    cached,
    demo: demoData,
  });
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
    queryFn: () => load<Objects>([...keys.objects()], '/api/foreman/objects', ObjectsResponse, demo.objects),
  });
}

export function useSchedule(objectId: string | null, brigadeId: string | null, date: string) {
  return useQuery({
    queryKey: keys.schedule(objectId ?? '', brigadeId ?? '', date),
    enabled: !!objectId && !!brigadeId,
    queryFn: () => load<Schedule>(
      [...keys.schedule(objectId!, brigadeId!, date)],
      `/api/foreman/object/${encodeURIComponent(objectId!)}/schedule?brigade_id=${encodeURIComponent(brigadeId!)}&date=${date}`,
      ScheduleResponse,
      { ...demo.schedule, date },
    ),
  });
}

export function useLeaderboard(objectId: string | null) {
  return useQuery({
    queryKey: keys.leaderboard(objectId ?? ''),
    enabled: !!objectId,
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
