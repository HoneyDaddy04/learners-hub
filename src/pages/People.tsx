import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JobRole, MemberRow, Role } from '@shared/types';
import { api } from '../lib/api';
import { roleLabel } from '../lib/format';
import { useMember } from '../lib/session';
import { Badge, ErrorBox, Modal, PageHeader, Spinner } from '../components/ui';

type Draft = { email: string; name: string; role: Role; department: string; jobRoleId: string; managerId: string };
const blank: Draft = { email: '', name: '', role: 'member', department: '', jobRoleId: '', managerId: '' };

export function People() {
  const { member: me } = useMember();
  const qc = useQueryClient();
  const people = useQuery({ queryKey: ['members'], queryFn: () => api.get<MemberRow[]>('/members') });
  const roles = useQuery({ queryKey: ['job-roles'], queryFn: () => api.get<JobRole[]>('/job-roles') });
  const [editing, setEditing] = useState<MemberRow | 'new' | null>(null);
  const [newRole, setNewRole] = useState('');

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['members'] });
    void qc.invalidateQueries({ queryKey: ['team'] });
  };
  const addRole = useMutation({
    mutationFn: () => api.post('/job-roles', { name: newRole }),
    onSuccess: () => {
      setNewRole('');
      void qc.invalidateQueries({ queryKey: ['job-roles'] });
    },
  });

  return (
    <>
      <PageHeader title="People" subtitle="Invite your team, set roles and who manages whom."
        actions={<button className="btn-primary" onClick={() => setEditing('new')}>Invite person</button>} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card overflow-x-auto">
          {people.isPending ? <Spinner /> : people.error ? <div className="p-4"><ErrorBox error={people.error} /></div> : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Access</th><th className="px-4 py-3 font-medium">Job role</th><th className="px-4 py-3 font-medium">Manager</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {people.data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">{p.name}{p.status === 'invited' && <Badge tone="amber">Invited</Badge>}</div>
                      <div className="text-slate-500">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">{roleLabel[p.role]}</td>
                    <td className="px-4 py-3">{p.jobRoleName ?? <span className="text-slate-400">—</span>}{p.department && <div className="text-slate-500">{p.department}</div>}</td>
                    <td className="px-4 py-3">{p.managerName ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-right"><button className="btn-secondary" onClick={() => setEditing(p)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="card h-fit p-5">
          <h2 className="font-medium">Job roles</h2>
          <p className="mt-1 text-sm text-slate-500">Used to group people and build paths for them.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {roles.data?.map((r) => <li key={r.id}><Badge>{r.name}</Badge></li>)}
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); addRole.mutate(); }}>
            <input className="input" placeholder="New job role" value={newRole} onChange={(e) => setNewRole(e.target.value)} required aria-label="New job role" />
            <button className="btn-secondary" disabled={addRole.isPending}>Add</button>
          </form>
          {addRole.error && <div className="mt-2"><ErrorBox error={addRole.error} /></div>}
        </aside>
      </div>

      {editing && (
        <PersonDialog
          person={editing === 'new' ? null : editing}
          people={people.data ?? []}
          roles={roles.data ?? []}
          canGrantOwner={me.role === 'owner'}
          isSelf={editing !== 'new' && editing.id === me.id}
          onClose={() => setEditing(null)}
          onSaved={() => { refresh(); setEditing(null); }}
        />
      )}
    </>
  );
}

function PersonDialog({ person, people, roles, canGrantOwner, isSelf, onClose, onSaved }: {
  person: MemberRow | null; people: MemberRow[]; roles: JobRole[]; canGrantOwner: boolean; isSelf: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(person
    ? { email: person.email, name: person.name, role: person.role, department: person.department ?? '', jobRoleId: person.jobRoleId ?? '', managerId: person.managerId ?? '' }
    : blank);
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  const fields = { name: d.name, role: d.role, department: d.department || null, jobRoleId: d.jobRoleId || null, managerId: d.managerId || null };
  const save = useMutation({
    mutationFn: () => (person ? api.patch(`/members/${person.id}`, fields) : api.post('/members', { ...fields, email: d.email })),
    onSuccess: onSaved,
  });
  const remove = useMutation({ mutationFn: () => api.patch(`/members/${person!.id}`, { status: 'removed' }), onSuccess: onSaved });
  const managers = people.filter((p) => p.id !== person?.id && p.role !== 'member');

  return (
    <Modal title={person ? `Edit ${person.name}` : 'Invite a person'} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {!person && (
          <div>
            <label className="label" htmlFor="p-email">Work email</label>
            <input id="p-email" type="email" className="input" value={d.email} onChange={set('email')} required />
            <p className="mt-1 text-xs text-slate-500">They join by signing in with this email address.</p>
          </div>
        )}
        <div>
          <label className="label" htmlFor="p-name">Name</label>
          <input id="p-name" className="input" value={d.name} onChange={set('name')} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-role">Access</label>
            <select id="p-role" className="input" value={d.role} onChange={set('role')} disabled={isSelf}>
              <option value="member">Member: learns</option>
              <option value="manager">Manager: assigns to their team</option>
              <option value="admin">Admin: manages everything</option>
              {(canGrantOwner || d.role === 'owner') && <option value="owner">Owner</option>}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-dept">Department</label>
            <input id="p-dept" className="input" value={d.department} onChange={set('department')} />
          </div>
          <div>
            <label className="label" htmlFor="p-job">Job role</label>
            <select id="p-job" className="input" value={d.jobRoleId} onChange={set('jobRoleId')}>
              <option value="">None</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-mgr">Manager</label>
            <select id="p-mgr" className="input" value={d.managerId} onChange={set('managerId')}>
              <option value="">None</option>
              {managers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        {(save.error || remove.error) && <ErrorBox error={save.error ?? remove.error} />}
        <div className="flex flex-wrap justify-between gap-2">
          {person && !isSelf ? (
            <button type="button" className="btn-danger" disabled={remove.isPending}
              onClick={() => window.confirm(`Remove ${person.name} from your organisation?`) && remove.mutate()}>Remove</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={save.isPending}>{person ? 'Save' : 'Send invite'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
