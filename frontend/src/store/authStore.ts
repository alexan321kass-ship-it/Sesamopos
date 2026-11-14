import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const getStoredAuthUser = (): User | null => {
  try {
    const stored = localStorage.getItem('sesamo_auth_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {}
  return null;
};

const initialUser = getStoredAuthUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,
  login: (user) => {
    try {
      localStorage.setItem('sesamo_auth_user', JSON.stringify(user));
      localStorage.setItem('sesamo_last_activity', String(Date.now()));
    } catch (e) {}
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    try {
      localStorage.removeItem('sesamo_auth_user');
      localStorage.removeItem('sesamo_last_activity');
    } catch (e) {}
    set({ user: null, isAuthenticated: false });
  },
}));

