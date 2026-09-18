import type { Status, StatusReason, Tone } from '@/contract';
import { displayStatus, STATUS_LABEL, STATUS_TONE, REASON_LABEL } from '@/contract/labels';

/** Классы цвета чипа из стилей макета. */
const TONE_CLASS: Record<Tone, string> = { ok: 'ok', warn: 'warn', bad: 'bad', grey: 'acc', blue: 'manual' };

export function StatusChip({ status, reason }: { status: Status; reason?: StatusReason | null }) {
  const d = displayStatus(status);
  return (
    <span className={`chip ${TONE_CLASS[STATUS_TONE[d]]}`}>
      {STATUS_LABEL[d]}
      {reason ? ` · ${REASON_LABEL[reason]}` : ''}
    </span>
  );
}
