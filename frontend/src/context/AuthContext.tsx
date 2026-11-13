import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, type LoginPayload, type RegisterPayload } from "../api/authApi";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payloadOrUsername: LoginPayload | string, password?: string) => Promise<void>;
  register: (
    payloadOrUsername: RegisterPayload | string,
    email?: string,
    password?: string,
    confirm_password?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    if (!authApi.isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (payloadOrUsername: LoginPayload | string, password?: string) => {
    setIsLoading(true);
    try {
      let payload: LoginPayload;
      if (typeof payloadOrUsername === "string") {
        payload = {
          username_or_email: payloadOrUsername,
          password: password || "",
        };
      } else {
        payload = payloadOrUsername;
      }

      const response = await authApi.login(payload);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    payloadOrUsername: RegisterPayload | string,
    email?: string,
    password?: string,
    confirm_password?: string
  ) => {
    setIsLoading(true);
    try {
      let payload: RegisterPayload;
      if (typeof payloadOrUsername === "string") {
        payload = {
          username: payloadOrUsername,
          email: email || "",
          password: password || "",
          confirm_password: confirm_password || password || "",
        };
      } else {
        payload = payloadOrUsername;
      }

      const response = await authApi.register(payload);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: authApi.isAuthenticated(),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
