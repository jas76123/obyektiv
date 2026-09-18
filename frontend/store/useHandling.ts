'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Alert } from '@/contract';
import type { OutcomeCode } from '@/contract/labels';
import { load, save } from './storage';
import { effective, markSeen, markContacted, closeWith, type Handling } from './handling';

const KEY = 'handling';

export function useHandling() {
  const [local, setLocal] = useState<Record<string, Handling>>({});
  useEffect(() => { setLocal(load<Record<string, Handling>>(KEY, {})); }, []);

  const put = useCallback((id: string, h: Handling) => {
    setLocal((prev) => {
      const next = { ...prev, [id]: h };
      save(KEY, next);
      return next;
    });
  }, []);

  return {
    of: (a: Alert) => effective(a, local),
    seen: (a: Alert) => put(a.id, markSeen(effective(a, local), new Date())),
    contacted: (a: Alert, target: string, channel: string, asOf: string) => put(a.id, markContacted(effective(a, local), { target, channel, asOf, now: new Date() })),
    close: (a: Alert, outcome: OutcomeCode, comment: string) => put(a.id, closeWith(effective(a, local), { outcome, comment, now: new Date() })),
  };
}
