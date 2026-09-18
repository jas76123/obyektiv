import type { Tag } from '@/contract';

export function Tags({ tags, extra }: { tags: Tag[]; extra?: Tag | null }) {
  const all = extra ? [...tags, extra] : tags;
  return (
    <>
      {all.map((t, i) => (
        <span key={i} className={`tag ${t.kind}`}>{t.text}</span>
      ))}
    </>
  );
}
