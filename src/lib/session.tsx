import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeResponse, Role } from '@shared/types';
import { api } from './api';
import { auth } from './firebase';

interface Session {
  /** undefined while Firebase restores the session. */
  firebaseUser: User | null | undefined;
  me: MeResponse | undefined;
  meLoading: boolean;
  meError: unknown;
  refreshMe: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const qc = useQueryClient();

  useEffect(() => onIdTokenChanged(auth, setFirebaseUser), []);

  const meQuery = useQuery({
    queryKey: ['me', firebaseUser?.uid],
    queryFn: () => api.get<MeResponse>('/me'),
    enabled: !!firebaseUser,
    staleTime: 60_000,
  });

  const value: Session = {
    firebaseUser,
    me: meQuery.data,
    meLoading: !!firebaseUser && meQuery.isPending,
    meError: meQuery.error,
    refreshMe: () => meQuery.refetch(),
    logout: async () => {
      await signOut(auth);
      qc.clear();
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

/** The signed-in member; only call below the membership gate in App. */
export function useMember() {
  const { me } = useSession();
  if (!me?.member || !me.org) throw new Error('useMember without a membership');
  const role: Role = me.member.role;
  return {
    member: me.member,
    org: me.org,
    isAdmin: role === 'owner' || role === 'admin',
    isManager: role === 'owner' || role === 'admin' || role === 'manager',
  };
}
