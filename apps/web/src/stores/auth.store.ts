import { create } from 'zustand';
import type { UserRole } from '@aidflow/shared';

interface AuthUser {
  id:     string;
  role:   UserRole;
  orgId:  string | null;
  email:  string;
  name:   string;
}

interface AuthStore {
  user:        AuthUser | null;
  accessToken: string | null;
  isLoading:   boolean;
  setSession:  (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  logout:      () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:        null,
  accessToken: null,
  isLoading:   true,
  setSession:  (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logout:      () => set({ user: null, accessToken: null }),
}));