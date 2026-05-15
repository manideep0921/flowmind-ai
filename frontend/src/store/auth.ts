// src/store/auth.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, organization: Organization) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      organization: null,
      isAuthenticated: false,
      login: (token, user, organization) => {
        localStorage.setItem("token", token);
        set({ token, user, organization, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("token");
        set({ token: null, user: null, organization: null, isAuthenticated: false });
      },
    }),
    {
      name: "flowmind-auth",
      // Exclude token from persisted state — it's managed via localStorage "token" key
      // directly so the axios interceptor in lib/api.ts can read it without importing the store.
      partialize: (state) => ({ user: state.user, organization: state.organization, isAuthenticated: state.isAuthenticated }),
    }
  )
);
