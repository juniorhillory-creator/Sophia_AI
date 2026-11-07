import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { GoogleButton } from "../components/GoogleButton";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    clearError();
    try {
      await login({ username_or_email: usernameOrEmail, password });
      navigate(from, { replace: true });
    } catch {
      // Error is set by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand mb-4" aria-hidden="true">
            <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="brandGradientLogin" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f26934" />
                  <stop offset="100%" stopColor="#c44e22" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="15" stroke="url(#brandGradientLogin)" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Welcome back</h1>
          <p className="mt-2 text-sm text-stone-600">Sign in to access your research papers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">Username or email</label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(event) => setUsernameOrEmail(event.target.value)}
              placeholder="Enter your username or email"
              className="w-full border border-stone-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-lg"
              required
              autoComplete="username"
            />
          </div>

          <PasswordInput
            value={password}
            onChange={setPassword}
            disabled={submitting || isLoading}
            error={error ?? undefined}
          />

          <div className="flex items-center justify-between">
            <label className="text-sm text-stone-600 cursor-pointer flex items-center gap-1">
              <input type="checkbox" className="rounded border-stone-300 text-brand focus:ring-brand" /> Remember me
            </label>
            <a href="/forgot-password" className="text-sm text-brand hover:text-brand-dark hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-2.5 text-base font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-300"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-500">Or continue with</span>
            </div>
          </div>

          <GoogleButton onClick={() => navigate("/auth/google")} disabled={submitting || isLoading} />

          <p className="mt-6 text-center text-sm text-stone-600">
            Don't have an account?{" "}
            <a href="/register" className="font-medium text-brand hover:text-brand-dark">
              Create account
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}