import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { createPhotosCache, type PhotosSnapshot } from '../lib/photosCache';

/** Единственный экземпляр кэша списка фото (последний ответ GET /photos). */
export const photosCache = createPhotosCache(AsyncStorage);

// Пока экран рейтинга на виду, /photos спрашивается по тику и без своих ждущих фото —
// иначе рейтинг других бригад не обновится. С закрытым рейтингом лишних запросов нет:
// маршрут тяжёлый для сервера команды (спека 26.09 §9).
let wanted = false;
export function setPhotosWanted(v: boolean): void { wanted = v; }
export function photosWanted(): boolean { return wanted; }

/** Список фото и время последнего ответа для экрана рейтинга. */
export function usePhotos(): PhotosSnapshot {
  const [snap, setSnap] = useState<PhotosSnapshot>(() => photosCache.get());
  useEffect(() => {
    photosCache.load().then(() => setSnap(photosCache.get()));
    return photosCache.on(() => setSnap(photosCache.get()));
  }, []);
  return snap;
}
