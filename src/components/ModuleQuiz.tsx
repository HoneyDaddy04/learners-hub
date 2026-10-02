import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PathModule, QuizResult } from '@shared/types';
import { api } from '../lib/api';
import { ErrorBox } from './ui';

export function ModuleQuiz({ module, pathId, canTake }: { module: PathModule; pathId: string; canTake: boolean }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => module.quiz.map(() => undefined));
  const [result, setResult] = useState<QuizResult | null>(null);

  const submit = useMutation({
    mutationFn: () => api.post<QuizResult>(`/progress/quiz/${module.id}`, { answers }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['path', pathId] });
      void qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });

  const retry = () => {
    setResult(null);
    setAnswers(module.quiz.map(() => undefined));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-medium">Module check</h4>
        {module.quizPassed && !result && <span className="text-sm text-emerald-700">Passed ✓ (best {module.bestScore}/{module.quiz.length})</span>}
      </div>

      <ol className="space-y-5">
        {module.quiz.map((q, qi) => (
          <li key={q.id}>
            <p className="mb-2 text-sm font-medium">{qi + 1}. {q.prompt}</p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const marked = result && chosen ? (result.correct[qi] ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50') : '';
                return (
                  <label key={oi} className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-3 py-2 text-sm ${chosen ? 'border-indigo-400' : 'border-slate-200'} ${marked}`}>
                    <input
                      type="radio"
                      className="mt-0.5"
                      name={`q-${q.id}`}
                      checked={chosen}
                      disabled={!canTake || !!result}
                      onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!canTake ? (
          <p className="text-sm text-slate-500">Start the path to take this check.</p>
        ) : result ? (
          <>
            <p className={`text-sm font-medium ${result.passed ? 'text-emerald-700' : 'text-amber-800'}`}>
              {result.score}/{result.total} correct. {result.passed ? 'Passed.' : 'Not quite: review the lessons and try again.'}
            </p>
            <button className="btn-secondary" onClick={retry}>Try again</button>
          </>
        ) : (
          <button className="btn-primary" disabled={answers.some((a) => a === undefined) || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Checking…' : 'Submit answers'}
          </button>
        )}
      </div>
      {submit.error && <div className="mt-3"><ErrorBox error={submit.error} /></div>}
    </div>
  );
}
