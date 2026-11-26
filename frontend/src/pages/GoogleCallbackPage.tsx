import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { User } from "../types";

export const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
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
          "Google Sign-In is not currently enabled in your Supabase project. To enable it, activate the Google provider in your Supabase Dashboard (Authentication > Providers > Google) with Google Cloud credentials, or sign in using username/password."
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
      const userObj: User = {
        id: sbUser.id,
        username: sbUser.user_metadata?.username || sbUser.email?.split("@")[0] || "user",
        email: sbUser.email || "",
        full_name: sbUser.user_metadata?.full_name || null,
        avatar_url: sbUser.user_metadata?.avatar_url || null,
        is_active: true,
        is_verified: true,
        created_at: now,
        updated_at: now,
      };

      setSession(
        {
          access_token: session.access_token,
          refresh_token: session.refresh_token || "",
        },
        userObj
      );
      window.location.replace("/");
    };

    if (!isSupabaseConfigured) {
      const code = searchParams.get("code") || hashParams.get("code");
      if (code) {
        void (async () => {
          try {
            const redirect_uri = window.location.origin + "/auth/google/callback";
            const response = await authApi.googleAuth({ code, redirect_uri });
            setSession(response.tokens, response.user);
            window.location.replace("/");
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

    // Supabase auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        handleSessionSuccess(session);
      }
    });

    let timeoutId: number | undefined;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          handleSessionSuccess(data.session);
          return;
        }
      } catch (err) {
        console.warn("getSession error:", err);
      }

      // Check hash parameters (implicit flow)
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
          if (setErr) {
            console.warn("setSession error from hash:", setErr);
          }
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

      // Check query parameters for authorization code (PKCE flow)
      const code = searchParams.get("code") || hashParams.get("code");
      if (code) {
        try {
          const { data } = await supabase.auth.exchangeCodeForSession(code);
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
          const response = await authApi.googleAuth({ code, redirect_uri });
          setSession(response.tokens, response.user);
          window.location.replace("/");
          return;
        } catch (err: unknown) {
          setLoading(false);
          const msg = err instanceof Error ? err.message : "Failed to complete Google sign-in. Please try again.";
          if (msg.toLowerCase().includes("not implemented") || msg.toLowerCase().includes("not configured")) {
            setError(
              "Google OAuth is not configured on this project. Please configure Google OAuth credentials or sign in with your username/email and password."
            );
          } else {
            setError(msg);
          }
          return;
        }
      }

      timeoutId = window.setTimeout(() => {
        if (!handledRef.current) {
          setLoading(false);
          setError(
            "No authorization code received from Google. If using Supabase, please verify that your Redirect URLs in the Supabase Dashboard include this origin."
          );
        }
      }, 2500);
    })();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate, setSession]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          p: { xs: 2, sm: 4 },
          textAlign: "center",
        }}
      >
        <CardContent>
          {loading ? (
            <Box sx={{ py: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <CircularProgress size={44} sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Completing Google sign-in…
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Verifying your credentials and setting up your workspace.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ py: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 52 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Sign-in failed
              </Typography>
              {error && (
                <Alert severity="error" sx={{ width: "100%", textAlign: "left", mt: 1 }}>
                  {error}
                </Alert>
              )}
              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/login")}
                sx={{ mt: 3, fontWeight: 600, py: 1.2, px: 3 }}
              >
                Back to Sign In
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};
