/**
 * Пока последний ответ пришёл с проблемой (сервер не ответил, ушли в кэш или
 * демо), переспрашиваем сервер каждые 15 с. Иначе строка «сервер не отвечает»
 * висит в шапке до смены вкладки, даже когда сеть давно вернулась: у нарядов,
 * объектов и рейтинга нет своего опроса, в отличие от статусов фото.
 */
export const PROBLEM_POLL_MS = 15_000;

export function problemPollInterval(data: { problem?: string } | undefined): number | false {
  return data?.problem ? PROBLEM_POLL_MS : false;
}
