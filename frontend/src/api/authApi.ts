import { apiClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./axiosInstance";
import type { AuthResponse, User, TokenResponse } from "../types";

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  username_or_email: string;
  password: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", payload);
    const { tokens } = response.data;
    if (tokens?.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", payload);
    const { tokens } = response.data;
    if (tokens?.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      await apiClient.post("/auth/logout", { access_token: accessToken });
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  },
};

