import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword, errorMessage } from "../api/auth";
import { AuthLayout } from "../components/AuthLayout";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword({ username_or_email: usernameOrEmail.trim() });
      setSent(true);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-fade-in">
        {sent ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-light text-success mb-4" aria-hidden="true">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-stone-900">Check your email</h2>
              <p className="mt-2 text-sm text-stone-600">
                We've sent a password reset link to your email address.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              Back to sign in
            </button>
            <p className="mt-4 text-center text-xs text-stone-500">
              Didn't receive an email? Check your spam folder or try again.
            </p>
          </>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand mb-4" aria-hidden="true">
                <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="brandGradientForgot" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#f26934" />
                      <stop offset="100%" stopColor="#c44e22" />
                    </linearGradient>
                  </defs>
                  <circle cx="16" cy="16" r="15" stroke="url(#brandGradientForgot)" strokeWidth="2" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">Forgot password?</h1>
              <p className="mt-2 text-sm text-stone-600">Enter your username or email to reset your password</p>
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
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-base font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-600">
              Remember your password?{" "}
              <a href="/login" className="font-medium text-brand hover:text-brand-dark">
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}