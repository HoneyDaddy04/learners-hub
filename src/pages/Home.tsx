import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { MyEnrollment } from '@shared/types';
import { api } from '../lib/api';
import { isOverdue, shortDate } from '../lib/format';
import { useMember } from '../lib/session';
import { Badge, Empty, ErrorBox, PageHeader, ProgressBar, Spinner } from '../components/ui';

export function Home() {
  const { member } = useMember();
  const q = useQuery({ queryKey: ['enrollments', 'mine'], queryFn: () => api.get<MyEnrollment[]>('/enrollments/mine') });

  const active = q.data?.filter((e) => !e.completedAt) ?? [];
  const done = q.data?.filter((e) => e.completedAt) ?? [];
  const overdue = active.filter((e) => isOverdue(e.dueDate, e.completedAt)).length;

  return (
    <>
      <PageHeader
        title={`Hi ${member.name.split(' ')[0]}`}
        subtitle={q.data ? `${active.length} in progress · ${done.length} completed${overdue ? ` · ${overdue} overdue` : ''}` : undefined}
        actions={<Link to="/library" className="btn-secondary">Browse the library</Link>}
      />

      {q.isPending ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data.length === 0 ? (
        <Empty title="Nothing to learn yet">
          Paths your manager assigns will show up here. You can also <Link to="/library" className="text-indigo-600 hover:underline">pick one from the library</Link>.
        </Empty>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && <Section title="In progress" items={active} />}
          {done.length > 0 && <Section title="Completed" items={done} />}
        </div>
      )}
    </>
  );
}

function Section({ title, items }: { title: string; items: MyEnrollment[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => <EnrollmentCard key={e.id} e={e} />)}
      </div>
    </section>
  );
}

function EnrollmentCard({ e }: { e: MyEnrollment }) {
  const overdue = isOverdue(e.dueDate, e.completedAt);
  return (
    <Link to={`/paths/${e.pathId}`} className="card flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="mb-3 flex flex-wrap gap-2">
        {e.completedAt ? <Badge tone="green">Completed {shortDate(e.completedAt)}</Badge>
          : overdue ? <Badge tone="red">Overdue · {shortDate(e.dueDate)}</Badge>
          : e.dueDate ? <Badge tone="amber">Due {shortDate(e.dueDate)}</Badge> : null}
        {e.source === 'assigned' && <Badge tone="indigo">Assigned{e.assignedByName ? ` by ${e.assignedByName}` : ''}</Badge>}
      </div>
      <h3 className="font-semibold leading-snug">{e.pathTitle}</h3>
      <p className="mt-1 text-sm text-slate-500">{e.roleName}</p>
      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>{e.progress.itemsDone}/{e.progress.itemsTotal} lessons · {e.progress.quizzesPassed}/{e.progress.quizzesTotal} checks</span>
          <span className="font-medium text-slate-700">{e.progress.percent}%</span>
        </div>
        <ProgressBar percent={e.progress.percent} />
      </div>
    </Link>
  );
}
