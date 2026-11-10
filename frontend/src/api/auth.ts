import { API_BASE, errorMessage, toApiError } from "./client";
import type {
  AuthResponse,
  AuthTokens,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  GoogleAuthResponse,
  LoginRequest,
  PasswordResetTokenResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "./types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/v1/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw toApiError(0, null);
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw toApiError(response.status, payload);
  }
  return payload as T;
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>("/login", credentials);
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>("/register", data);
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<PasswordResetTokenResponse> {
  return postJson<PasswordResetTokenResponse>("/forgot-password", data);
}

export async function resetPassword(data: ResetPasswordRequest): Promise<PasswordResetTokenResponse> {
  return postJson<PasswordResetTokenResponse>("/reset-password", data);
}

export async function googleAuth(data: GoogleAuthRequest): Promise<GoogleAuthResponse> {
  return postJson<GoogleAuthResponse>("/google", data);
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return postJson<AuthTokens>("/refresh", { refresh_token: refreshToken });
}

export async function logout(accessToken: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw toApiError(response.status, null);
  }
}

export { errorMessage };