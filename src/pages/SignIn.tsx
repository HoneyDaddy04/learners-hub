import { useState } from 'react';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const friendly: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use at least 8 characters for your password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
};

function authError(e: unknown) {
  const code = (e as { code?: string }).code ?? '';
  return friendly[code] ?? 'Sign-in failed. Please try again.';
}

export function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => run(async () => {
    if (mode === 'signin') {
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }
    if (password.length < 8) throw { code: 'auth/weak-password' };
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white">LH</span>
          <h1 className="text-2xl font-semibold tracking-tight">Learners Hub</h1>
          <p className="mt-1 text-sm text-slate-500">Learning paths for your team, built from free courses and videos.</p>
        </div>

        <div className="card space-y-4 p-6">
          <button className="btn-secondary w-full" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6C12.3 13.6 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.8c-.5-1.4-.8-3-.8-4.8s.3-3.3.8-4.8l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.4 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>

          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="name">Your name</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Work email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            <button className="btn-primary w-full" disabled={busy}>{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          </form>

          <div className="flex justify-between text-sm">
            <button className="text-indigo-600 hover:underline" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Create an account' : 'I have an account'}
            </button>
            {mode === 'signin' && (
              <button
                className="text-slate-500 hover:underline"
                onClick={() => email ? run(async () => { await sendPasswordResetEmail(auth, email); setNotice('Password reset email sent.'); }) : setError('Enter your email first.')}
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
