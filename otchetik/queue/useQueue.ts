import { useCallback, useEffect, useState } from 'react';
import { queueEvents } from './queueEvents';
import { getStore, storeReady } from './store';
import { runQueueNow } from './triggers';
import { EMPTY_COUNTS, type ShotRecord } from './types';

export function useQueue(sinceDays = 7) {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [records, setRecords] = useState<ShotRecord[]>([]);

  const refresh = useCallback(async () => {
    await storeReady();
    const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
    const [c, r] = await Promise.all([getStore().countByStatus(), getStore().listAll(since)]);
    setCounts(c);
    setRecords(r);
  }, [sinceDays]);

  useEffect(() => {
    refresh();
    return queueEvents.on(refresh);
  }, [refresh]);

  /** «В очереди»: всё, что ещё не на сервере. */
  const pending = counts.queued + counts.uploading + counts.failed;
  const runNow = useCallback(async () => { const r = await runQueueNow(); await refresh(); return r; }, [refresh]);
  return { counts, records, pending, refresh, runNow };
}
