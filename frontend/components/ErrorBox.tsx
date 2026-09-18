import { ApiError } from '@/api/source';

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error instanceof ApiError ? error : null;
  return (
    <div className="errbox" role="alert">
      <b>{e ? e.message : 'Не удалось показать экран'}</b>
      {e?.details.length ? <pre>{e.details.join('\n')}</pre> : null}
      {!e ? <pre>{String(error)}</pre> : null}
      {onRetry ? <button className="act" type="button" onClick={onRetry}>Повторить</button> : null}
    </div>
  );
}
