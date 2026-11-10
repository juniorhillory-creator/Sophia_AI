import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "../api/types";
import { login, register, logout, refreshTokens, errorMessage } from "../api/auth";
import { setAuthToken, setRefreshToken } from "../api/client";

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
  setSession: (tokens: { access_token: string; refresh_token: string }, user: User) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = sessionStorage.getItem("sophia_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.accessToken && parsed?.user) {
          setAuthToken(parsed.accessToken);
          setRefreshToken(parsed.refreshToken || null);
          return {
            kind: "authenticated",
            user: parsed.user,
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken || "",
          };
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
    return { kind: "unauthenticated" };
  });
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const setSession = useCallback(
    (tokens: { access_token: string; refresh_token: string }, user: User) => {
      setAuthToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
      try {
        sessionStorage.setItem(
          "sophia_auth",
          JSON.stringify({
            user,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          }),
        );
      } catch {
        // Ignore sessionStorage errors
      }
      setState({
        kind: "authenticated",
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      setError(null);
    },
    [],
  );

  const doLogin = useCallback(
    async (credentials: { username_or_email: string; password: string }) => {
      setState({ kind: "authenticating" });
      setError(null);
      try {
        const response = await login(credentials);
        setSession(response.tokens, response.user);
      } catch (reason) {
        setAuthToken(null);
        setRefreshToken(null);
        try {
          sessionStorage.removeItem("sophia_auth");
        } catch {}
        setState({ kind: "unauthenticated" });
        setError(errorMessage(reason));
        throw reason;
      }
    },
    [setSession],
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
        setSession(response.tokens, response.user);
      } catch (reason) {
        setAuthToken(null);
        setRefreshToken(null);
        try {
          sessionStorage.removeItem("sophia_auth");
        } catch {}
        setState({ kind: "unauthenticated" });
        setError(errorMessage(reason));
        throw reason;
      }
    },
    [setSession],
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
    setAuthToken(null);
    setRefreshToken(null);
    try {
      sessionStorage.removeItem("sophia_auth");
    } catch {}
    setState({ kind: "unauthenticated" });
    setError(null);
  }, [state]);

  const doRefreshSession = useCallback(async () => {
    const current = state;
    if (current.kind !== "authenticated") return;
    try {
      const tokens = await refreshTokens(current.refreshToken);
      setSession(tokens, current.user);
    } catch {
      setAuthToken(null);
      setRefreshToken(null);
      try {
        sessionStorage.removeItem("sophia_auth");
      } catch {}
      setState({ kind: "unauthenticated" });
      setError("Session expired. Please sign in again.");
    }
  }, [state, setSession]);

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
    setSession,
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
