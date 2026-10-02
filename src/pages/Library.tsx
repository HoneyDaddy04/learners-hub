import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { PathSummary } from '@shared/types';
import { api } from '../lib/api';
import { duration } from '../lib/format';
import { useMember } from '../lib/session';
import { Badge, Empty, ErrorBox, PageHeader, ProgressBar, Spinner } from '../components/ui';

export function Library() {
  const { isManager } = useMember();
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['paths', 'all'], queryFn: () => api.get<PathSummary[]>('/paths') });

  const term = search.trim().toLowerCase();
  const matches = (q.data ?? []).filter((p) => !term || `${p.title} ${p.roleName} ${p.description ?? ''}`.toLowerCase().includes(term));
  const drafts = matches.filter((p) => p.status === 'draft');
  const published = matches.filter((p) => p.status === 'published');

  return (
    <>
      <PageHeader
        title="Library"
        subtitle="Learning paths approved for your organisation."
        actions={isManager && <Link to="/build" className="btn-primary">Build a path</Link>}
      />
      <input className="input mb-6 max-w-sm" type="search" placeholder="Search by role or topic" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search paths" />

      {q.isPending ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : (
        <div className="space-y-8">
          {isManager && drafts.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Drafts awaiting review</h2>
              <Grid paths={drafts} />
            </section>
          )}
          <section>
            {isManager && drafts.length > 0 && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Published</h2>}
            {published.length === 0 ? (
              <Empty title={term ? 'No paths match your search' : 'No published paths yet'}>
                {!term && (isManager ? 'Build a path for a role and an admin can approve it.' : 'Your admins have not published any paths yet.')}
              </Empty>
            ) : <Grid paths={published} />}
          </section>
        </div>
      )}
    </>
  );
}

function Grid({ paths }: { paths: PathSummary[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {paths.map((p) => (
        <Link key={p.id} to={`/paths/${p.id}`} className="card flex flex-col p-5 transition-shadow hover:shadow-md">
          <div className="mb-3 flex flex-wrap gap-2">
            {p.status === 'draft' && <Badge tone="amber">Draft</Badge>}
            {p.level && <Badge>{p.level}</Badge>}
            {p.enrollment?.completedAt ? <Badge tone="green">Completed</Badge> : p.enrollment && <Badge tone="indigo">In progress</Badge>}
          </div>
          <h3 className="font-semibold leading-snug">{p.title}</h3>
          <p className="mt-1 text-sm text-slate-500">For {p.roleName}</p>
          {p.description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{p.description}</p>}
          <div className="mt-auto pt-4 text-xs text-slate-500">
            {p.moduleCount} modules · {p.itemCount} lessons{p.totalDurationSec ? ` · ${duration(p.totalDurationSec)} of video` : ''}
            {p.enrollment && <ProgressBar percent={p.enrollment.progress.percent} className="mt-2" />}
          </div>
        </Link>
      ))}
    </div>
  );
}
