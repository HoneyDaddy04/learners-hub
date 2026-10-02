import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SOURCE_OPTIONS, type SourcingEvent } from '@shared/types';
import { api, errorMessage } from '../lib/api';
import { PageHeader } from '../components/ui';

const STEPS = ['Mapping the skills for the role', 'Searching allowed free sources', 'Choosing and ordering lessons', 'Writing module checks'];

export function BuildPath() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const [context, setContext] = useState('');
  const [sources, setSources] = useState<string[]>(['youtube', 'mslearn', 'google', 'khan']);
  const [step, setStep] = useState<number | null>(null);
  const [stepLabel, setStepLabel] = useState('');
  const [error, setError] = useState('');

  const running = step !== null;
  const toggle = (key: string) => setSources((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const run = async () => {
    setError('');
    setStep(0);
    setStepLabel(STEPS[0]);
    let finished = false;
    try {
      await api.stream<SourcingEvent>('/paths/source', { role, context: context || undefined, sources }, (e) => {
        if (e.type === 'step') {
          setStep(e.step);
          setStepLabel(e.label);
        } else if (e.type === 'error') {
          finished = true;
          setError(e.message);
        } else if (e.type === 'done') {
          finished = true;
          void qc.invalidateQueries({ queryKey: ['paths'] });
          navigate(`/paths/${e.pathId}`);
        }
      });
      if (!finished) setError('The connection closed before the path was ready. Check the library for a new draft, or try again.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setStep(null);
    }
  };

  return (
    <>
      <PageHeader title="Build a path" subtitle="Describe a role. AI finds free lessons, orders them and writes short checks. You review before anyone sees it." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form className="card space-y-5 p-6" onSubmit={(e) => { e.preventDefault(); void run(); }}>
          <div>
            <label className="label" htmlFor="role">Job role</label>
            <input id="role" className="input" placeholder="e.g. Customer support agent" value={role} onChange={(e) => setRole(e.target.value)} required minLength={2} maxLength={120} disabled={running} />
          </div>
          <div>
            <label className="label" htmlFor="context">Context (optional)</label>
            <textarea id="context" className="input min-h-24" maxLength={1000} disabled={running}
              placeholder="e.g. New hires at a 20-person SaaS company. We use Zendesk and Google Workspace."
              value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
          <fieldset>
            <legend className="label">Allowed free sources</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SOURCE_OPTIONS.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={sources.includes(s.key)} onChange={() => toggle(s.key)} disabled={running} />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button className="btn-primary" disabled={running || sources.length === 0 || role.trim().length < 2}>
            {running ? 'Building…' : 'Build draft path'}
          </button>
        </form>

        <aside className="card h-fit p-6">
          <h2 className="mb-4 font-medium">{running ? 'Working on it' : 'How it works'}</h2>
          <ol className="space-y-3">
            {STEPS.map((label, i) => {
              const state = step === null ? 'idle' : i < step ? 'done' : i === step ? 'active' : 'todo';
              return (
                <li key={label} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    state === 'done' ? 'bg-emerald-500 text-white' : state === 'active' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {state === 'done' ? '✓' : i + 1}
                  </span>
                  <span className={state === 'active' ? 'font-medium text-slate-900' : 'text-slate-600'}>
                    {state === 'active' ? stepLabel : label}
                    {state === 'active' && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 align-middle" />}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-xs text-slate-500">Usually takes 1–3 minutes. Keep this tab open.</p>
        </aside>
      </div>
    </>
  );
}
