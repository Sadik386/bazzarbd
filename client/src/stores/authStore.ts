import { create } from "zustand";
import { api, refreshAccessToken, setAccessToken } from "@/lib/api";
import { signInWithGooglePopup } from "@/lib/firebase";
import type { User } from "@/types";

const SESSION_HINT_KEY = "bazzarbd_has_session";

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "ORDER_MANAGER",
  "CONTENT_MANAGER",
  "SUPPORT_AGENT",
  "ADMIN",
]);

export function isAdminRole(role?: string | null): boolean {
  return Boolean(role && ADMIN_ROLES.has(role));
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  checkSession: () => Promise<void>;
  login: (email: string, password: string, isAdminLogin?: boolean) => Promise<User>;
  signup: (email: string, password: string, displayName: string) => Promise<User>;
  googleLogin: () => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  checkSession: async () => {
    const hasHint =
      typeof window !== "undefined" && localStorage.getItem(SESSION_HINT_KEY) === "1";
    if (!hasHint) {
      set({ user: null, initialized: true });
      return;
    }

    set({ loading: true });
    try {
      const token = await refreshAccessToken();
      if (!token) {
        localStorage.removeItem(SESSION_HINT_KEY);
        set({ user: null, loading: false, initialized: true });
        return;
      }
      const user = await api.get<User>("/auth/me");
      set({ user, loading: false, initialized: true });
    } catch {
      localStorage.removeItem(SESSION_HINT_KEY);
      setAccessToken(null);
      set({ user: null, loading: false, initialized: true });
    }
  },

  login: async (email, password, isAdminLogin = false) => {
    const data = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
      isAdminLogin,
    });
    setAccessToken(data.token);
    localStorage.setItem(SESSION_HINT_KEY, "1");
    set({ user: data.user, initialized: true });
    return data.user;
  },

  signup: async (email, password, display_name) => {
    const data = await api.post<AuthResponse>("/auth/signup", {
      email,
      password,
      display_name,
    });
    setAccessToken(data.token);
    localStorage.setItem(SESSION_HINT_KEY, "1");
    set({ user: data.user, initialized: true });
    return data.user;
  },

  googleLogin: async () => {
    const popupResult = await signInWithGooglePopup();
    const data = await api.post<AuthResponse>("/auth/google-login", {
      idToken: popupResult.idToken,
      email: popupResult.email,
      display_name: popupResult.displayName,
    });
    setAccessToken(data.token);
    localStorage.setItem(SESSION_HINT_KEY, "1");
    set({ user: data.user, initialized: true });
    return data.user;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem(SESSION_HINT_KEY);
    setAccessToken(null);
    set({ user: null });
  },
}));
