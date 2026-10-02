import { useState } from 'react';
import { reload, sendEmailVerification } from 'firebase/auth';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import { useSession } from '../lib/session';
import { ErrorBox } from '../components/ui';

/** Signed in but not yet in an org: accept an invite or start a new organisation. */
export function Onboarding() {
  const { me, refreshMe, logout } = useSession();
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState(me?.user.name ?? '');
  const [notice, setNotice] = useState('');

  const join = useMutation({
    mutationFn: (membershipId: string) => api.post('/me/join', { membershipId }),
    onSuccess: () => void refreshMe(),
  });
  const create = useMutation({
    mutationFn: () => api.post('/me/org', { orgName, name }),
    onSuccess: () => void refreshMe(),
  });

  // After clicking the email link, refresh the token so the server sees email_verified.
  const recheck = async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
    await refreshMe();
    if (!auth.currentUser.emailVerified) setNotice('Not verified yet. Click the link in the email we sent you.');
  };

  if (!me) return null;
  const invites = me.invites;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome{me.user.name ? `, ${me.user.name}` : ''}</h1>
          <p className="mt-1 text-sm text-slate-500">Signed in as {me.user.email}</p>
        </div>

        {!me.user.emailVerified && (
          <div className="card space-y-3 p-5 text-sm">
            <p><strong>Were you invited by your company?</strong> Verify your email first so we can find your invite.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => void recheck()}>I've verified my email</button>
              <button className="btn-secondary" onClick={async () => {
                if (auth.currentUser) await sendEmailVerification(auth.currentUser).catch(() => undefined);
                setNotice('Verification email sent.');
              }}>Resend email</button>
            </div>
            {notice && <p className="text-slate-600">{notice}</p>}
          </div>
        )}

        {invites.length > 0 && (
          <div className="card space-y-3 p-5">
            <h2 className="font-medium">You've been invited</h2>
            {invites.map((inv) => (
              <div key={inv.membershipId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
                <span className="font-medium">{inv.orgName}</span>
                <button className="btn-primary" disabled={join.isPending} onClick={() => join.mutate(inv.membershipId)}>Join</button>
              </div>
            ))}
            {join.error && <ErrorBox error={join.error} />}
          </div>
        )}

        <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div>
            <h2 className="font-medium">{invites.length ? 'Or start a new organisation' : 'Start your organisation'}</h2>
            <p className="mt-1 text-sm text-slate-500">You'll be its owner and can invite your team.</p>
          </div>
          <div>
            <label className="label" htmlFor="org">Company name</label>
            <input id="org" className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="myname">Your name</label>
            <input id="myname" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {create.error && <ErrorBox error={create.error} />}
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create organisation'}</button>
        </form>

        <p className="text-center text-sm"><button className="text-slate-500 hover:underline" onClick={() => void logout()}>Sign out</button></p>
      </div>
    </div>
  );
}
