import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'director' | 'employee';

export interface AuthUser {
  id:       string;
  name:     string;
  username: string;
  email:    string;
  phone:    string;
  position: string;
  company:  string | null;
  avatar:   string | null;
}

interface AuthStore {
  user: AuthUser | null;
  role: UserRole | null;
  employeeName: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setUser: (user: AuthUser, role: UserRole, employeeName?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      employeeName: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setUser: (user, role, employeeName) =>
        set({ user, role, employeeName: employeeName ?? null, isAuthenticated: !!user }),
      logout: () => set({ user: null, role: null, employeeName: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
      partialize: (s) => ({
        user: s.user,
        role: s.role,
        employeeName: s.employeeName,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);

interface UIStore {
  sidebarOpen: boolean;
  isDarkMode:  boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen:   true,
      isDarkMode:    false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen:(open) => set({ sidebarOpen: open }),
      toggleDarkMode:() => set((s) => ({ isDarkMode: !s.isDarkMode })),
      setDarkMode:   (dark) => set({ isDarkMode: dark }),
    }),
    {
      name: 'crm-ui',
      partialize: (s) => ({ isDarkMode: s.isDarkMode }),
    },
  ),
);

