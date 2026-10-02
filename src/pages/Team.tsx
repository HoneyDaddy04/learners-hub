import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { TeamRow } from '@shared/types';
import { api } from '../lib/api';
import { shortDate } from '../lib/format';
import { useMember } from '../lib/session';
import { AssignDialog } from '../components/AssignDialog';
import { Badge, Empty, ErrorBox, PageHeader, ProgressBar, Spinner } from '../components/ui';

export function Team() {
  const { isAdmin } = useMember();
  const [assignFor, setAssignFor] = useState<string[] | null>(null);
  const q = useQuery({ queryKey: ['team'], queryFn: () => api.get<TeamRow[]>('/team') });

  const all = q.data?.flatMap((r) => r.enrollments) ?? [];
  const stats = {
    people: q.data?.length ?? 0,
    active: all.filter((e) => !e.completedAt).length,
    completed: all.filter((e) => e.completedAt).length,
    overdue: all.filter((e) => e.overdue).length,
  };

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={isAdmin ? 'Everyone in your organisation.' : 'People who report to you.'}
        actions={<button className="btn-primary" onClick={() => setAssignFor([])}>Assign a path</button>}
      />

      {q.isPending ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data.length === 0 ? (
        <Empty title="No one on your team yet">
          {isAdmin ? <>Invite people on the <Link to="/people" className="text-indigo-600 hover:underline">People</Link> page.</> : 'An admin can set you as someone\'s manager on the People page.'}
        </Empty>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="People" value={stats.people} />
            <Stat label="Paths in progress" value={stats.active} />
            <Stat label="Paths completed" value={stats.completed} />
            <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? 'text-red-600' : undefined} />
          </div>

          <div className="space-y-3">
            {q.data.map(({ member, enrollments }) => (
              <div key={member.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {member.status === 'invited' && <Badge tone="amber">Invited</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{[member.jobRoleName, member.department, member.email].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button className="btn-secondary" onClick={() => setAssignFor([member.id])}>Assign</button>
                </div>
                {enrollments.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No paths yet.</p>
                ) : (
                  <ul className="mt-4 grid gap-3 md:grid-cols-2">
                    {enrollments.map((e) => (
                      <li key={e.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <Link to={`/paths/${e.pathId}`} className="text-sm font-medium hover:text-indigo-700">{e.pathTitle}</Link>
                          {e.completedAt ? <Badge tone="green">Done</Badge> : e.overdue ? <Badge tone="red">Overdue</Badge> : e.dueDate ? <Badge tone="amber">Due {shortDate(e.dueDate)}</Badge> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <ProgressBar percent={e.progress.percent} />
                          <span className="w-10 text-right text-xs font-medium text-slate-600">{e.progress.percent}%</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {assignFor && <AssignDialog memberIds={assignFor} onClose={() => setAssignFor(null)} />}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? ''}`}>{value}</p>
    </div>
  );
}
