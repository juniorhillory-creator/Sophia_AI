import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { GoogleButton } from "../components/GoogleButton";

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (password: string) => password.length >= 8 },
  { label: "One uppercase letter", test: (password: string) => /[A-Z]/.test(password) },
  { label: "One lowercase letter", test: (password: string) => /[a-z]/.test(password) },
  { label: "One number", test: (password: string) => /[0-9]/.test(password) },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.username.trim()) return "Username is required.";
    if (form.username.trim().length < 3) return "Username must be at least 3 characters.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Please enter a valid email address.";
    if (!form.password) return "Password is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm_password) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    clearError();
    const validationError = validateForm();
    if (validationError) {
      setSubmitting(false);
      return;
    }
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      });
      navigate("/");
    } catch {
      // Error is set by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const passwordRequirementStatus = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(form.password),
  }));

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand mb-4" aria-hidden="true">
            <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="brandGradientRegister" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f26934" />
                  <stop offset="100%" stopColor="#c44e22" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="15" stroke="url(#brandGradientRegister)" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Create account</h1>
          <p className="mt-2 text-sm text-stone-600">Join Sophia AI to manage your research papers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(event) => handleInputChange("username", event.target.value)}
              placeholder="Choose a username"
              className="w-full border border-stone-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-lg"
              required
              autoComplete="username"
              disabled={submitting || isLoading}
            />
            {form.username.trim() && form.username.trim().length < 3 && (
              <p className="text-sm text-error">Username must be at least 3 characters.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleInputChange("email", event.target.value)}
              placeholder="you@example.com"
              className="w-full border border-stone-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-lg"
              required
              autoComplete="email"
              disabled={submitting || isLoading}
            />
          </div>

          <PasswordInput
            value={form.password}
            onChange={(value) => handleInputChange("password", value)}
            disabled={submitting || isLoading}
          />

          <PasswordInput
            label="Confirm password"
            value={form.confirm_password}
            onChange={(value) => handleInputChange("confirm_password", value)}
            disabled={submitting || isLoading}
          />

          <div className="space-y-1">
            <p className="text-xs text-stone-600 font-medium">Password requirements:</p>
            <ul className="space-y-0.5">
              {passwordRequirementStatus.map((req) => (
                <li key={req.label} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 text-stone-500 ${req.met ? "text-success" : "text-stone-400"}`}>
                    {req.met ? "✓" : "○"}
                  </span>
                  <span className={`text-stone-600 ${req.met ? "line-through opacity-60" : ""}`}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error-light border border-error/20 text-sm text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-2.5 text-base font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || isLoading ? "Creating account…" : "Create account"}
          </button>
        </form>

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
            Already have an account?{" "}
            <a href="/login" className="font-medium text-brand hover:text-brand-dark">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}