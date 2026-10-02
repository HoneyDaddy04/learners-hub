import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBox, Spinner } from './components/ui';
import { useMember, useSession } from './lib/session';
import { BuildPath } from './pages/BuildPath';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Onboarding } from './pages/Onboarding';
import { PathView } from './pages/PathView';
import { People } from './pages/People';
import { SignIn } from './pages/SignIn';
import { Team } from './pages/Team';

export function App() {
  const { firebaseUser, me, meLoading, meError, logout } = useSession();

  if (firebaseUser === undefined || meLoading) return <Spinner />;
  if (!firebaseUser) return <SignIn />;
  if (meError) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16">
        <ErrorBox error={meError} />
        <button className="btn-secondary" onClick={() => void logout()}>Sign out</button>
      </div>
    );
  }
  if (!me?.member) return <Onboarding />;
  return <MemberRoutes />;
}

function MemberRoutes() {
  const { isAdmin, isManager } = useMember();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="library" element={<Library />} />
        <Route path="paths/:id" element={<PathView />} />
        {isManager && <Route path="team" element={<Team />} />}
        {isManager && <Route path="build" element={<BuildPath />} />}
        {isAdmin && <Route path="people" element={<People />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
