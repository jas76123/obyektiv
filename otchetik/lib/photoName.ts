/**
 * Бригада и наряд едят в имени файла при загрузке (спека 26.09 §5.1): сервер Георгия
 * не хранит ни task_id, ни бригаду, но имя файла сохраняет как `{server_id}_{наше имя}`
 * и отдаёт его в GET /photos. Разделитель — точка: сервер режет имя по первому
 * подчёркиванию, а id у команды с дефисами, без точек.
 */
export function photoFileName(brigadeId: string | null | undefined, taskId: string, uuid: string): string {
  return `${brigadeId || 'unknown'}.${taskId}.${uuid}.jpg`;
}

/** Разбор имени из GET /photos. Имена не нашего формата (загрузки Татьяны, старые снимки) → null. */
export function parsePhotoFile(file: string): { brigade_id: string; task_id: string; local_uuid: string } | null {
  const us = file.indexOf('_');
  const ours = us >= 0 ? file.slice(us + 1) : file;
  const m = /^([^.\s_]+)\.([^.\s_]+)\.([^.\s_]+)\.jpe?g$/i.exec(ours);
  if (!m) return null;
  return { brigade_id: m[1], task_id: m[2], local_uuid: m[3] };
}
