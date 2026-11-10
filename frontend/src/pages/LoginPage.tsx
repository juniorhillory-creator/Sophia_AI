import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { GoogleButton } from "../components/GoogleButton";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    clearError();
    setGoogleError(null);
    try {
      await login({ username_or_email: usernameOrEmail.trim(), password });
      navigate(from, { replace: true });
    } catch {
      // Error is captured and set by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    clearError();
    if (isSupabaseConfigured) {
      try {
        const { data, error: sbError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/google/callback`,
          },
        });
        if (sbError) {
          setGoogleError(`Google sign-in error: ${sbError.message}`);
          return;
        }
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        setGoogleError("Unable to initiate Google sign-in. Please try again or use password.");
      }
    } else {
      setGoogleError("Google OAuth is not configured on this environment. Please sign in with username/email and password.");
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light p-2.5 mb-4 shadow-sm" aria-hidden="true">
            <img src="/logo-icon.png" alt="Sophia AI Logo" className="h-full w-full object-contain" />
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
              onChange={(event) => {
                setUsernameOrEmail(event.target.value);
                if (error) clearError();
              }}
              placeholder="Enter your username or email"
              className="w-full border border-stone-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-lg disabled:bg-stone-50 disabled:text-stone-500"
              required
              autoComplete="username"
              disabled={submitting || isLoading}
            />
          </div>

          <PasswordInput
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (error) clearError();
            }}
            disabled={submitting || isLoading}
            error={error ?? undefined}
          />

          <div className="flex items-center justify-between">
            <label className="text-sm text-stone-600 cursor-pointer flex items-center gap-1.5">
              <input type="checkbox" className="rounded border-stone-300 text-brand focus:ring-brand" /> Remember me
            </label>
            <a href="/forgot-password" className="text-sm font-medium text-brand hover:text-brand-dark hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-2.5 text-base font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting || isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {(error || googleError) && (
          <div className="mt-4 p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error flex items-start justify-between gap-2">
            <span>{error || googleError}</span>
            <button
              type="button"
              onClick={() => {
                clearError();
                setGoogleError(null);
              }}
              className="text-error hover:text-red-800 text-xs font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400 font-medium">Or continue with</span>
            </div>
          </div>

          <div className="mt-4">
            <GoogleButton onClick={handleGoogleSignIn} disabled={submitting || isLoading} />
          </div>

          <p className="mt-6 text-center text-sm text-stone-600">
            Don't have an account?{" "}
            <a href="/register" className="font-semibold text-brand hover:text-brand-dark hover:underline">
              Create account
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}