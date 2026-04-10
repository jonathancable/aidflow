import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@aidflow/shared';

interface AuthUser {
  id:       string;
  role:     UserRole;
  orgId:    string | null;
  email:    string;
  name:     string;
  walletId: string | null;
}

interface AuthStore {
  user:        AuthUser | null;
  accessToken: string | null;
  isLoading:   boolean;
  setSession:  (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  logout:      () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,
      isLoading:   false,
      setSession:  (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout:      () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'aidflow-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
);