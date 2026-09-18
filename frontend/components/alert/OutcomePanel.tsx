'use client';
import { useState } from 'react';
import { OUTCOMES, type OutcomeCode } from '@/contract/labels';

/** Панель фиксации исхода (мокап 0.4, outcomePanel, строки 836–843). Комментарий обязателен (BR-705). */
export function OutcomePanel({ onClose }: { onClose: (outcome: OutcomeCode, comment: string) => void }) {
  const [comment, setComment] = useState('');
  const ready = comment.trim().length > 0;
  return (
    <div className="outcomes">
      <span className="msgh">Исход обязателен: закрыть без причины нельзя</span>
      <textarea className="msgbox" rows={2} style={{ width: '100%' }} placeholder="комментарий: что подтвердил или чем объяснил подрядчик…" value={comment} onChange={(e) => setComment(e.target.value)} />
      {OUTCOMES.map((o) => (
        <button key={o.code} className="act" type="button" disabled={!ready} onClick={() => onClose(o.code, comment)}>{o.label}</button>
      ))}
      <span className="evlabel" style={{ width: '100%', textAlign: 'left' }}>
        закрыть может руководитель проекта или технадзор · «объяснено» и «ложное» переводят работу в «решено вручную»: она перестаёт считаться расхождением
      </span>
    </div>
  );
}
