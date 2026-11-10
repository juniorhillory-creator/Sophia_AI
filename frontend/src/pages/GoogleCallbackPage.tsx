import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { googleAuth } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract params from both search query and hash fragment
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const errorParam = searchParams.get("error") || hashParams.get("error");
    const errorDescription =
      searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      searchParams.get("error_code") ||
      hashParams.get("error_code");

    if (errorParam) {
      setLoading(false);
      const isNotEnabled =
        errorParam === "unsupported_provider" ||
        (errorDescription && errorDescription.toLowerCase().includes("not enabled")) ||
        (errorDescription && errorDescription.toLowerCase().includes("validation failed"));
      if (isNotEnabled) {
        setError(
          "Google Sign-In is not currently enabled in your Supabase project. To enable it, activate the Google provider in your Supabase Dashboard (Authentication > Providers > Google) with Google Cloud credentials, or sign in using username/password.",
        );
      } else {
        setError(`Google sign-in was cancelled or failed: ${errorDescription || errorParam}`);
      }
      return;
    }

    const handleSessionSuccess = (session: { access_token: string; refresh_token: string; user: any }) => {
      const sbUser = session.user;
      const now = new Date().toISOString();
      setSession(
        {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
        {
          id: sbUser.id,
          username: sbUser.user_metadata?.username || sbUser.email?.split("@")[0] || "user",
          email: sbUser.email || "",
          full_name: sbUser.user_metadata?.full_name || null,
          avatar_url: sbUser.user_metadata?.avatar_url || null,
          is_active: true,
          is_verified: true,
          created_at: now,
          updated_at: now,
        },
      );
      navigate("/dashboard", { replace: true });
    };

    // 2. Check if Supabase handled OAuth directly via URL hash
    if (isSupabaseConfigured && window.location.hash && window.location.hash.includes("access_token")) {
      void (async () => {
        try {
          const { data, error: sessionErr } = await supabase.auth.getSession();
          if (data?.session?.user) {
            handleSessionSuccess(data.session);
            return;
          }
          if (sessionErr) {
            setLoading(false);
            setError(`Google session error: ${sessionErr.message}`);
            return;
          }
        } catch (err: unknown) {
          setLoading(false);
          setError(err instanceof Error ? err.message : "Session error");
        }
      })();
      return;
    }

    // 3. Check query parameters for authorization code (PKCE flow)
    const code = searchParams.get("code");
    if (!code) {
      setLoading(false);
      setError("No authorization code received from Google.");
      return;
    }

    void (async () => {
      // 1. Check if Supabase's detectSessionInUrl already processed the code
      if (isSupabaseConfigured) {
        try {
          const { data: existingData } = await supabase.auth.getSession();
          if (existingData?.session?.user) {
            handleSessionSuccess(existingData.session);
            return;
          }
        } catch {
          // Continue to manual exchange
        }

        // 2. Explicitly exchange code for session
        try {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session?.user) {
            handleSessionSuccess(data.session);
            return;
          }
          if (exchangeErr) {
            // Secondary check if getSession succeeded concurrently
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session?.user) {
              handleSessionSuccess(retryData.session);
              return;
            }
            setLoading(false);
            setError(`Google sign-in error: ${exchangeErr.message}`);
            return;
          }
        } catch (sbErr) {
          setLoading(false);
          const msg = sbErr instanceof Error ? sbErr.message : "Supabase authentication exchange failed";
          setError(`Google sign-in error: ${msg}`);
          return;
        }
      }

      // Second attempt: fall back to backend Google auth endpoint
      try {
        const redirect_uri = window.location.origin + "/auth/google/callback";
        const response = await googleAuth({ code, redirect_uri });
        setSession(response.tokens, response.user);
        navigate("/dashboard", { replace: true });
      } catch (err: unknown) {
        setLoading(false);
        const msg = err instanceof Error ? err.message : "Failed to complete Google sign-in. Please try again.";
        if (msg.toLowerCase().includes("not implemented") || msg.toLowerCase().includes("not configured")) {
          setError(
            "Google OAuth is not configured on this project. Please configure Google OAuth credentials or sign in with your username/email and password.",
          );
        } else {
          setError(msg);
        }
      }
    })();
  }, [navigate, setSession]);

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