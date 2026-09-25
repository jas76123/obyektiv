import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { createMlResults } from '../lib/mlResults';

/** Единственный экземпляр словаря результатов нейросети в приложении. */
export const mlResults = createMlResults(AsyncStorage);

/** local_uuid → «нейросеть ничего не нашла»; для taskState/buildReport (ReportOpts.mlEmpty). */
export function useMlEmpty(): Record<string, boolean> {
  const [map, setMap] = useState<Record<string, boolean>>(() => mlResults.emptyMap());
  useEffect(() => {
    mlResults.load().then(() => setMap(mlResults.emptyMap()));
    return mlResults.on(() => setMap(mlResults.emptyMap()));
  }, []);
  return map;
}
