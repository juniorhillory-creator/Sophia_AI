import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "../api/types";
import { login, register, logout, refreshTokens, errorMessage } from "../api/auth";

type AuthState =
  | { kind: "unauthenticated" }
  | { kind: "authenticating" }
  | { kind: "authenticated"; user: User; accessToken: string; refreshToken: string };

interface AuthContextType {
  state: AuthState;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { username_or_email: string; password: string }) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: "unauthenticated" });
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const doLogin = useCallback(
    async (credentials: { username_or_email: string; password: string }) => {
      setState({ kind: "authenticating" });
      setError(null);
      try {
        const response = await login(credentials);
        setState({
          kind: "authenticated",
          user: response.user,
          accessToken: response.tokens.access_token,
          refreshToken: response.tokens.refresh_token,
        });
      } catch (reason) {
        setState({ kind: "unauthenticated" });
        setError(errorMessage(reason));
        throw reason;
      }
    },
    [],
  );

  const doRegister = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      confirm_password: string;
    }) => {
      setState({ kind: "authenticating" });
      setError(null);
      try {
        const response = await register(data);
        setState({
          kind: "authenticated",
          user: response.user,
          accessToken: response.tokens.access_token,
          refreshToken: response.tokens.refresh_token,
        });
      } catch (reason) {
        setState({ kind: "unauthenticated" });
        setError(errorMessage(reason));
        throw reason;
      }
    },
    [],
  );

  const doLogout = useCallback(async () => {
    const current = state;
    if (current.kind === "authenticated") {
      try {
        await logout(current.accessToken);
      } catch {
        // Ignore logout errors; clear local state regardless
      }
    }
    setState({ kind: "unauthenticated" });
    setError(null);
  }, [state]);

  const doRefreshSession = useCallback(async () => {
    const current = state;
    if (current.kind !== "authenticated") return;
    try {
      const tokens = await refreshTokens(current.refreshToken);
      setState((prev) => {
        if (prev.kind !== "authenticated") return prev;
        return { ...prev, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
      });
    } catch {
      setState({ kind: "unauthenticated" });
      setError("Session expired. Please sign in again.");
    }
  }, [state]);

  useEffect(() => {
    // No token persistence: tokens live in memory only per security rules
  }, []);

  const value: AuthContextType = {
    state,
    user: state.kind === "authenticated" ? state.user : null,
    isAuthenticated: state.kind === "authenticated",
    isLoading: state.kind === "authenticating",
    error,
    login: doLogin,
    register: doRegister,
    logout: doLogout,
    clearError,
    refreshSession: doRefreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}