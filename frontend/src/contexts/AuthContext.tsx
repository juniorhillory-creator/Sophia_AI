import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "../api/auth";
import { setAuthToken, setRefreshToken } from "../api/client";
import type { User, LoginRequest, RegisterRequest } from "../api/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string, user: User) => void;
}

const STORAGE_KEY = "sophia_auth";

const AuthContext = createContext<AuthContextValue | null>(null);

function loadFromStorage(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  useEffect(() => {
    setAuthToken(state.accessToken);
    setRefreshToken(state.refreshToken);
  }, [state.accessToken, state.refreshToken]);

  const persist = (next: AuthState) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    setAuthToken(next.accessToken);
    setRefreshToken(next.refreshToken);
  };

  const setTokens = useCallback((access: string, refresh: string, user: User) => {
    persist({ user, accessToken: access, refreshToken: refresh });
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const res = await apiLogin(credentials);
    persist({ user: res.user, accessToken: res.tokens.access_token, refreshToken: res.tokens.refresh_token });
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await apiRegister(data);
    persist({ user: res.user, accessToken: res.tokens.access_token, refreshToken: res.tokens.refresh_token });
  }, []);

  const logout = useCallback(async () => {
    if (state.accessToken) {
      try { await apiLogout(state.accessToken); } catch { /* ignore */ }
    }
    sessionStorage.removeItem(STORAGE_KEY);
    persist({ user: null, accessToken: null, refreshToken: null });
  }, [state.accessToken]);

  return (
    <AuthContext.Provider value={{
      user: state.user,
      isAuthenticated: !!state.accessToken,
      login,
      register,
      logout,
      setTokens,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

