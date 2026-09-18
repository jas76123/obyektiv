'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/api';
import { useLoad } from '@/components/useLoad';
import { useQuery } from '@/components/useQuery';
import { ErrorBox } from '@/components/ErrorBox';
import { ObjectStrip } from '@/components/portfolio/ObjectStrip';
import { SummaryRow } from '@/components/portfolio/SummaryRow';
import { FeedControls } from '@/components/portfolio/FeedControls';
import { AlertCard } from '@/components/portfolio/AlertCard';
import { AlertTable } from '@/components/portfolio/AlertTable';
import { SetupBlock } from '@/components/portfolio/SetupBlock';
import { feedList, feedCounts, setupList, type FeedState } from '@/components/portfolio/feedLogic';
import { useHandling } from '@/store/useHandling';
import { manualTag } from '@/store/handling';
import { summarize, badgeOf } from '@/store/summary';
import { loadContacts, contactFor } from '@/store/contacts';
import { fmtFull } from '@/lib/format';
import type { Contact } from '@/contract';

export default function PortfolioPage() {
  const { data, error, loading, reload } = useLoad(() => api.portfolio(), []);
  const handling = useHandling();
  const query = useQuery();
  const [feed, setFeed] = useState<FeedState>({ objectId: null, sort: 'sev', onlyNew: false, onlyBad: false, showClosed: false });
  const [view, setView] = useState<'feed' | 'table'>('feed');
  const [added, setAdded] = useState<Contact[]>([]);

  useEffect(() => { setAdded(loadContacts()); }, []);
  useEffect(() => { if (query) setFeed((f) => ({ ...f, objectId: query.get('object') })); }, [query]);

  const selectObject = (id: string) => {
    const next = feed.objectId === id ? null : id;
    setFeed({ ...feed, objectId: next });
    window.history.replaceState(null, '', next ? `?object=${encodeURIComponent(next)}` : window.location.pathname);
  };

  const list = useMemo(() => (data ? feedList(data.alerts, handling.of, feed) : []), [data, handling, feed]);

  if (loading) return <div className="loading">ЗАГРУЗКА…</div>;
  if (error || !data) return <ErrorBox error={error} onRetry={reload} />;

  const scope = feed.objectId ? data.objects.find((o) => o.id === feed.objectId)?.short_name ?? feed.objectId : 'все объекты';
  return (
    <>
      <div className="asof">ДАННЫЕ НА {fmtFull(data.as_of).toUpperCase()}</div>
      <ObjectStrip objects={data.objects} badge={(id) => badgeOf(id, data.alerts, handling.of)} selected={feed.objectId} onSelect={selectObject} />
      <SummaryRow summary={summarize(data.alerts, handling.of)} objectsTotal={data.objects.length} scoped={feed.objectId !== null} />
      <FeedControls state={feed} view={view} counts={feedCounts(data.alerts, handling.of, feed.objectId)} shown={list.length} scopeLabel={scope} onState={setFeed} onView={setView} />
      {view === 'table' ? (
        <AlertTable alerts={list} handlingOf={handling.of} contactOf={(a) => contactFor(a, added)} sort={feed.sort} onSort={(sort) => setFeed({ ...feed, sort })} />
      ) : (
        <div className="feed">
          {list.length ? list.map((a) => <AlertCard key={a.id} alert={a} extraTag={manualTag(handling.of(a))} />) : (
            <div className="empty">По выбранным условиям расхождений нет. Это не значит, что всё в порядке: часть работ система не проверяет.</div>
          )}
        </div>
      )}
      <SetupBlock alerts={setupList(data.alerts, feed.objectId)} />
    </>
  );
}
