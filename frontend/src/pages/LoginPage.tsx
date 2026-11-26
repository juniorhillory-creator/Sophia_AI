import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  IconButton,
  Link as MuiLink,
  CircularProgress,
  Container,
  Divider,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import logoImg from '../assets/logo.png';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { GoogleButton } from '../components/common/GoogleButton';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Please provide your username/email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(usernameOrEmail.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          borderRadius: 3.5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 10px 30px rgba(0, 0, 0, 0.4)'
              : '0 10px 30px rgba(79, 70, 229, 0.08)',
        }}
      >
        {/* Brand header */}
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box
            component="img"
            src={logoImg}
            alt="Sophia AI Logo"
            sx={{
              width: 56,
              height: 56,
              objectFit: 'contain',
              mb: 2,
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}
          >
            Welcome to Sophia AI
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sign in to access your research papers, structured summaries, and RAG chat.
          </Typography>
        </Box>

        {error && (
          <Box sx={{ mb: 3 }}>
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
          </Box>
        )}

        {/* Login form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            disabled={loading}
            autoComplete="username"
            autoFocus
            sx={{ mb: 2.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              py: 1.4,
              fontSize: '0.95rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', my: 2.5 }}>
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="caption" sx={{ px: 2, color: 'text.secondary', fontWeight: 600 }}>
              OR
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          <GoogleButton onClick={handleGoogleSignIn} disabled={loading} />

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Don't have an account?{' '}
              <MuiLink
                component={RouterLink}
                to="/register"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Create one now
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
