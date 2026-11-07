import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, error } = useAuth();

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (token && !resolved) {
      setResolved(true);
    } else if (!token) {
      setTokenError("Invalid or missing reset token. Please request a new password reset.");
    }
  }, [token, resolved]);

  const [pageError, setPageError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.new_password) return "New password is required.";
    if (form.new_password.length < 8) return "Password must be at least 8 characters.";
    if (form.new_password !== form.confirm_password) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setPageError(null);
    const validationError = validateForm();
    if (validationError) {
      setSubmitting(false);
      setPageError(validationError);
      return;
    }
    if (!token) {
      setSubmitting(false);
      setPageError("Invalid or missing reset token.");
      return;
    }
    try {
      await resetPassword({ token, new_password: form.new_password, confirm_password: form.confirm_password });
      navigate("/login");
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
                <linearGradient id="brandGradientReset" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f26934" />
                  <stop offset="100%" stopColor="#c44e22" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="15" stroke="url(#brandGradientReset)" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Reset password</h1>
          <p className="mt-2 text-sm text-stone-600">Create a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="New password"
            value={form.new_password}
            onChange={(value) => handleInputChange("new_password", value)}
            disabled={submitting || isLoading || !token}
          />

          <PasswordInput
            label="Confirm new password"
            value={form.confirm_password}
            onChange={(value) => handleInputChange("confirm_password", value)}
            disabled={submitting || isLoading || !token}
          />

          {pageError && (
            <div className="p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error">
              {pageError}
            </div>
          )}

          {tokenError && (
            <div className="p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error">
              {tokenError}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isLoading || !token}
            className="w-full py-2.5 text-base font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || isLoading ? "Resetting…" : "Reset password"}
          </button>
        </form>

        {!token && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm font-medium text-brand hover:text-brand-dark"
            >
              Request a new reset link
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-brand hover:text-brand-dark">
            Sign in
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}