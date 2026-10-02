import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PathSummary, TeamRow } from '@shared/types';
import { api } from '../lib/api';
import { ErrorBox, Modal, Spinner } from './ui';

/** Assign a published path to people. Pass pathId to fix the path, or memberIds to preselect people. */
export function AssignDialog({ onClose, pathId, memberIds = [] }: { onClose: () => void; pathId?: string; memberIds?: string[] }) {
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ['team'], queryFn: () => api.get<TeamRow[]>('/team') });
  const published = useQuery({ queryKey: ['paths', 'published'], queryFn: () => api.get<PathSummary[]>('/paths?status=published'), enabled: !pathId });
  const [chosenPath, setChosenPath] = useState(pathId ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds));
  const [dueDate, setDueDate] = useState('');

  const assign = useMutation({
    mutationFn: () => api.post<{ assigned: number }>('/enrollments/assign', { pathId: chosenPath, membershipIds: [...selected], dueDate: dueDate || null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['team'] });
      void qc.invalidateQueries({ queryKey: ['enrollments'] });
      void qc.invalidateQueries({ queryKey: ['paths'] });
      onClose();
    },
  });

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <Modal title="Assign a path" onClose={onClose}>
      {team.isPending ? <Spinner /> : team.error ? <ErrorBox error={team.error} /> : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); assign.mutate(); }}>
          {!pathId && (
            <div>
              <label className="label" htmlFor="assign-path">Path</label>
              <select id="assign-path" className="input" value={chosenPath} onChange={(e) => setChosenPath(e.target.value)} required>
                <option value="">Choose a published path…</option>
                {published.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <div className="label">People</div>
            {team.data.length === 0 ? (
              <p className="text-sm text-slate-500">Nobody reports to you yet. An admin can set managers on the People page.</p>
            ) : (
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {team.data.map(({ member }) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={selected.has(member.id)} onChange={() => toggle(member.id)} />
                    <span className="font-medium">{member.name}</span>
                    <span className="truncate text-slate-500">{member.jobRoleName ?? member.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="assign-due">Due date (optional)</label>
            <input id="assign-due" type="date" className="input" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          {assign.error && <ErrorBox error={assign.error} />}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!chosenPath || selected.size === 0 || assign.isPending}>
              {assign.isPending ? 'Assigning…' : `Assign to ${selected.size || ''} ${selected.size === 1 ? 'person' : 'people'}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
