import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BeatResponse, PathDetail, PathItem, PathModule } from '@shared/types';
import { api } from '../lib/api';
import { duration, isOverdue, shortDate } from '../lib/format';
import { useMember } from '../lib/session';
import { AssignDialog } from '../components/AssignDialog';
import { ModuleQuiz } from '../components/ModuleQuiz';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { Badge, ErrorBox, ProgressBar, Spinner } from '../components/ui';

export function PathView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, isManager } = useMember();
  const [assigning, setAssigning] = useState(false);
  const q = useQuery({ queryKey: ['path', id], queryFn: () => api.get<PathDetail>(`/paths/${id}`) });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['path', id] });
    void qc.invalidateQueries({ queryKey: ['paths'] });
    void qc.invalidateQueries({ queryKey: ['enrollments'] });
  };
  const action = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
  });

  if (q.isPending) return <Spinner />;
  if (q.error) return <ErrorBox error={q.error} />;
  const p = q.data;
  const e = p.enrollment;
  const enrolled = !!e && p.status === 'published';
  const confirmThen = (msg: string, fn: () => Promise<unknown>, after?: () => void) => {
    if (window.confirm(msg)) action.mutate(fn, { onSuccess: after });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {p.status === 'draft' && <Badge tone="amber">Draft: not visible to staff</Badge>}
          {p.status === 'archived' && <Badge>Archived</Badge>}
          {p.level && <Badge>{p.level}</Badge>}
          {e?.completedAt && <Badge tone="green">Completed {shortDate(e.completedAt)}</Badge>}
          {e && !e.completedAt && e.dueDate && (
            <Badge tone={isOverdue(e.dueDate, null) ? 'red' : 'amber'}>Due {shortDate(e.dueDate)}</Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          For {p.roleName} · {p.moduleCount} modules · {p.itemCount} lessons{p.totalDurationSec ? ` · ${duration(p.totalDurationSec)} of video` : ''}
        </p>
        {p.description && <p className="mt-3 max-w-3xl text-slate-700">{p.description}</p>}
        {p.context && p.canEdit && <p className="mt-2 text-sm text-slate-500">Brief: {p.context}</p>}

        {e && (
          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between text-xs text-slate-500">
              <span>{e.progress.itemsDone}/{e.progress.itemsTotal} lessons · {e.progress.quizzesPassed}/{e.progress.quizzesTotal} checks</span>
              <span className="font-medium text-slate-700">{e.progress.percent}%</span>
            </div>
            <ProgressBar percent={e.progress.percent} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {p.status === 'published' && !e && (
            <button className="btn-primary" disabled={action.isPending} onClick={() => action.mutate(() => api.post('/enrollments', { pathId: p.id }))}>Start this path</button>
          )}
          {p.status === 'published' && isManager && <button className="btn-secondary" onClick={() => setAssigning(true)}>Assign to people</button>}
          {e?.source === 'self' && !e.completedAt && (
            <button className="btn-secondary" disabled={action.isPending} onClick={() => confirmThen('Leave this path? Your progress is kept if you start again.', () => api.delete(`/enrollments/${e.id}`))}>Leave path</button>
          )}
          {p.canPublish && (
            <button className="btn-primary" disabled={action.isPending} onClick={() => confirmThen('Publish this path? Everyone in your organisation will be able to see it.', () => api.post(`/paths/${p.id}/publish`))}>Approve and publish</button>
          )}
          {p.canEdit && (
            <button className="btn-danger" disabled={action.isPending} onClick={() => confirmThen('Discard this draft? This cannot be undone.', () => api.delete(`/paths/${p.id}`), () => navigate('/library'))}>Discard draft</button>
          )}
          {p.status === 'published' && isAdmin && (
            <button className="btn-danger" disabled={action.isPending} onClick={() => confirmThen('Archive this path? It disappears from the library and from people\'s lists.', () => api.post(`/paths/${p.id}/archive`), () => navigate('/library'))}>Archive</button>
          )}
        </div>
        {p.canEdit && !p.canPublish && <p className="mt-3 text-sm text-slate-500">Review the lessons below, remove any that don't fit, then ask an admin to approve it.</p>}
        {p.canPublish && <p className="mt-3 text-sm text-slate-500">Watch a few lessons, remove anything that doesn't fit, then publish.</p>}
        {action.error && <div className="mt-3"><ErrorBox error={action.error} /></div>}
      </div>

      {p.modules.map((m, i) => (
        <ModuleCard key={m.id} index={i} module={m} path={p} enrolled={enrolled} onChanged={refresh}
          onRemove={(fn) => confirmThen('Remove this from the draft?', fn)} />
      ))}

      {assigning && <AssignDialog pathId={p.id} onClose={() => setAssigning(false)} />}
    </div>
  );
}

function ModuleCard({ index, module: m, path, enrolled, onChanged, onRemove }: {
  index: number; module: PathModule; path: PathDetail; enrolled: boolean; onChanged: () => void; onRemove: (fn: () => Promise<unknown>) => void;
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const done = m.items.filter((i) => i.progress?.status === 'done').length;

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Module {index + 1}</p>
          <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
          {m.summary && <p className="mt-1 text-sm text-slate-600">{m.summary}</p>}
        </div>
        <div className="flex items-center gap-3">
          {enrolled && <span className="text-sm text-slate-500">{done}/{m.items.length} done</span>}
          {path.canEdit && <button className="btn-danger" onClick={() => onRemove(() => api.delete(`/paths/${path.id}/modules/${m.id}`))}>Remove module</button>}
        </div>
      </div>

      <ul className="space-y-3">
        {m.items.map((item) => (
          <ItemRow key={item.id} item={item} path={path} enrolled={enrolled} open={openItem === item.id}
            onToggle={() => setOpenItem(openItem === item.id ? null : item.id)} onChanged={onChanged}
            onRemove={() => onRemove(() => api.delete(`/paths/${path.id}/items/${item.id}`))} />
        ))}
      </ul>

      {m.quiz.length > 0 && path.status !== 'draft' && <div className="mt-5"><ModuleQuiz module={m} pathId={path.id} canTake={enrolled} /></div>}
      {m.quiz.length > 0 && path.status === 'draft' && <p className="mt-4 text-sm text-slate-500">Includes a {m.quiz.length}-question check.</p>}
    </section>
  );
}

function ItemRow({ item, path, enrolled, open, onToggle, onChanged, onRemove }: {
  item: PathItem; path: PathDetail; enrolled: boolean; open: boolean; onToggle: () => void; onChanged: () => void; onRemove: () => void;
}) {
  const c = item.catalog;
  const isDone = item.progress?.status === 'done';
  const isVideo = c.source === 'youtube' && !!c.externalId;
  const [watched, setWatched] = useState(item.progress?.watchedSec ?? 0);

  const markDone = useMutation({ mutationFn: () => api.post('/progress/complete', { moduleItemId: item.id }), onSuccess: onChanged });
  const beat = (positionSec: number) => {
    if (!enrolled || isDone) return;
    api.post<BeatResponse>('/progress/beat', { moduleItemId: item.id, positionSec })
      .then((r) => {
        setWatched(r.watchedSec);
        if (r.justCompleted) onChanged();
      })
      .catch(() => undefined); // a dropped heartbeat only costs a few seconds of credit
  };
  const watchedPct = c.durationSec ? Math.min(100, Math.round((watched / c.durationSec) * 100)) : 0;

  return (
    <li className={`rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="h-20 w-32 shrink-0 rounded-lg object-cover" loading="lazy" />}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={c.format === 'video' ? 'indigo' : 'slate'}>{c.format}</Badge>
            {c.durationSec ? <span className="text-xs text-slate-500">{duration(c.durationSec)}</span> : null}
            {isDone && <Badge tone="green">Done ✓</Badge>}
          </div>
          <p className="font-medium leading-snug">{c.title}</p>
          <p className="text-sm text-slate-500">{c.provider}</p>
          {item.why && (path.canEdit || path.canPublish) && <p className="mt-1 text-sm italic text-slate-500">Why: {item.why}</p>}
          {isVideo && enrolled && !isDone && watched > 0 && (
            <div className="mt-2 max-w-xs">
              <ProgressBar percent={watchedPct} />
              <p className="mt-1 text-xs text-slate-500">{watchedPct}% watched · completes at 80%</p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isVideo ? (
            <button className={open ? 'btn-secondary' : 'btn-primary'} onClick={onToggle}>{open ? 'Close' : isDone ? 'Watch again' : 'Watch'}</button>
          ) : (
            <>
              <a className="btn-secondary" href={c.url} target="_blank" rel="noreferrer">Open ↗</a>
              {enrolled && !isDone && (
                <button className="btn-primary" disabled={markDone.isPending} onClick={() => markDone.mutate()}>Mark as done</button>
              )}
            </>
          )}
          {path.canEdit && <button className="btn-danger" onClick={onRemove} aria-label={`Remove ${c.title}`}>Remove</button>}
        </div>
      </div>
      {open && isVideo && (
        <div className="px-4 pb-4">
          <YouTubePlayer videoId={c.externalId!} startSec={isDone ? 0 : item.progress?.lastPositionSec ?? 0} onBeat={beat} />
          {!enrolled && path.status === 'published' && <p className="mt-2 text-sm text-slate-500">Start this path to have your watching counted.</p>}
        </div>
      )}
      {markDone.error && <div className="px-4 pb-4"><ErrorBox error={markDone.error} /></div>}
    </li>
  );
}
