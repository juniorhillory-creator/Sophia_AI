import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { googleAuth } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/AuthLayout";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setLoading(false);
      setError(`Google sign-in was cancelled or failed: ${errorDescription || errorParam}`);
      return;
    }

    if (!code) {
      setLoading(false);
      setError("No authorization code received from Google.");
      return;
    }

    (async () => {
      try {
        const redirect_uri = window.location.origin + "/auth/google/callback";
        const response = await googleAuth({ code, redirect_uri });
        setSession(response.tokens, response.user);
        navigate("/dashboard", { replace: true });
      } catch {
        setLoading(false);
        setError("Failed to complete Google sign-in. Please try again.");
      }
    })();
  }, [searchParams, navigate, setSession]);

  if (loading) {
    return (
      <AuthLayout>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-fade-in text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand mb-4" aria-hidden="true">
            <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm text-stone-600">Completing Google sign-in…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-fade-in text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-error-light text-error mb-4" aria-hidden="true">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Sign-in failed</h2>
        <p className="mt-2 text-sm text-stone-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-6 w-full py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Back to sign in
        </button>
      </div>
    </AuthLayout>
  );
}