import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api, setAccessToken } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  role?: 'USER' | 'SUPPORT_AGENT' | 'CONTENT_MANAGER' | 'ORDER_MANAGER' | 'SUPER_ADMIN';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, isAdminLogin?: boolean) => Promise<AuthUser>;
  signUp: (email: string, password: string, display_name: string) => Promise<AuthUser>;
  googleSignIn: (idToken: string, email?: string, displayName?: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh token on startup (silent refresh)
        const res = await api.post<{ token: string }>("/auth/refresh-token", {});
        setAccessToken(res.token);
        
        const userData = await api.get<AuthUser>("/auth/me");
        setUser(userData);
      } catch (err) {
        // Not logged in or refresh failed
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        // Track unique visitor hit silently
        api.post("/auth/track-visit", {}).catch(() => {});
      }
    };

    initAuth();
  }, []);

  const signIn = useCallback(async (email: string, password: string, isAdminLogin = false) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password, isAdminLogin });
    setAccessToken(res.token);
    window.dispatchEvent(new CustomEvent("auth-change", { detail: { type: "login", userId: res.user.id } }));
    setLoading(false);
    setUser(res.user);
    return res.user;
  }, []);

  const signUp = useCallback(async (email: string, password: string, display_name: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/signup", { email, password, display_name });
    setAccessToken(res.token);
    window.dispatchEvent(new CustomEvent("auth-change", { detail: { type: "login", userId: res.user.id } }));
    setLoading(false);
    setUser(res.user);
    return res.user;
  }, []);

  const googleSignIn = useCallback(async (idToken: string, email?: string, displayName?: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/google-login", { idToken, email, display_name: displayName });
    setAccessToken(res.token);
    window.dispatchEvent(new CustomEvent("auth-change", { detail: { type: "login", userId: res.user.id } }));
    setLoading(false);
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (err) {
      console.error("Logout API failed", err);
    }
    setAccessToken(null);
    localStorage.removeItem("admin_session");
    window.dispatchEvent(new CustomEvent("auth-change", { detail: { type: "logout" } }));
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, googleSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
