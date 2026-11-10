import { useState, useEffect, useRef } from "react";
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
  const handledRef = useRef(false);

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

    const handleSessionSuccess = (session: { access_token: string; refresh_token?: string; user: any }) => {
      if (handledRef.current) return;
      handledRef.current = true;

      const sbUser = session.user;
      const now = new Date().toISOString();
      setSession(
        {
          access_token: session.access_token,
          refresh_token: session.refresh_token || "",
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
      window.location.replace("/dashboard");
    };

    if (!isSupabaseConfigured) {
      // Direct backend OAuth fallback if Supabase is not configured
      const code = searchParams.get("code") || hashParams.get("code");
      if (code) {
        void (async () => {
          try {
            const redirect_uri = window.location.origin + "/auth/google/callback";
            const response = await googleAuth({ code, redirect_uri });
            setSession(response.tokens, response.user);
            window.location.replace("/dashboard");
          } catch (err: unknown) {
            setLoading(false);
            setError(err instanceof Error ? err.message : "Failed to complete Google sign-in.");
          }
        })();
        return;
      }
      setLoading(false);
      setError("Google OAuth is not configured on this environment.");
      return;
    }

    // 2. Set up Supabase auth state change listener to catch token events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        handleSessionSuccess(session);
      }
    });

    let timeoutId: number | undefined;

    void (async () => {
      // 3. Check if session is already stored or detected in URL
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          handleSessionSuccess(data.session);
          return;
        }
      } catch (err) {
        console.warn("getSession error:", err);
      }

      // 4. Check for hash parameters (implicit flow: #access_token=...&refresh_token=...)
      const hashAccessToken = hashParams.get("access_token") || searchParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token") || "";

      if (hashAccessToken) {
        try {
          const { data, error: setErr } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (data?.session?.user) {
            handleSessionSuccess(data.session);
            return;
          }
        } catch (setErr) {
          console.warn("setSession error from hash params:", setErr);
        }

        // Fallback: verify token directly to get user
        try {
          const { data: userData } = await supabase.auth.getUser(hashAccessToken);
          if (userData?.user) {
            handleSessionSuccess({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
              user: userData.user,
            });
            return;
          }
        } catch (userErr) {
          console.warn("getUser error from hash token:", userErr);
        }
      }

      // 5. Check query parameters for authorization code (PKCE flow)
      const code = searchParams.get("code") || hashParams.get("code");
      if (code) {
        try {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session?.user) {
            handleSessionSuccess(data.session);
            return;
          }
        } catch (sbErr) {
          console.warn("Supabase code exchange error:", sbErr);
        }

        // Fallback to backend Google auth endpoint
        try {
          const redirect_uri = window.location.origin + "/auth/google/callback";
          const response = await googleAuth({ code, redirect_uri });
          setSession(response.tokens, response.user);
          window.location.replace("/dashboard");
          return;
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
          return;
        }
      }

      // 6. Give onAuthStateChange a grace period to process background URL tokens
      timeoutId = window.setTimeout(() => {
        if (!handledRef.current) {
          setLoading(false);
          setError(
            "No authorization code received from Google. If you are using Supabase, please verify that 'https://sophia-ai-kappa.vercel.app/**' is added to your Redirect URLs in the Supabase Dashboard (Authentication > URL Configuration).",
          );
        }
      }, 2000);
    })();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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