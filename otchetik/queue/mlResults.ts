import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { createMlResults } from '../lib/mlResults';
import type { PhotoVerdict } from '../lib/status';

/** Единственный экземпляр словаря результатов нейросети в приложении. */
export const mlResults = createMlResults(AsyncStorage);

/** local_uuid → вердикт сверки фото; для taskState/buildReport (ReportOpts.verdicts) и слова фото. */
export function useMlVerdicts(): Record<string, PhotoVerdict> {
  const [map, setMap] = useState<Record<string, PhotoVerdict>>(() => mlResults.verdicts());
  useEffect(() => {
    mlResults.load().then(() => setMap(mlResults.verdicts()));
    return mlResults.on(() => setMap(mlResults.verdicts()));
  }, []);
  return map;
}
