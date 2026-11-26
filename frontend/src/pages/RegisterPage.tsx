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
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { GoogleButton } from '../components/common/GoogleButton';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, signInWithGoogle } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password, confirmPassword);
      navigate('/');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please check your information.';
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
            Create Your Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Join Sophia AI to synthesize academic research papers with verifiable citations.
          </Typography>
        </Box>

        {error && (
          <Box sx={{ mb: 3 }}>
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
          </Box>
        )}

        {/* Registration form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
            autoFocus
            sx={{ mb: 2 }}
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
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineIcon sx={{ color: 'text.secondary' }} />
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
            autoComplete="new-password"
            sx={{ mb: 2 }}
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

          <TextField
            fullWidth
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ color: 'text.secondary' }} />
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
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', my: 2.5 }}>
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="caption" sx={{ px: 2, color: 'text.secondary', fontWeight: 600 }}>
              OR
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          <GoogleButton text="Sign up with Google" onClick={handleGoogleSignIn} disabled={loading} />

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?{' '}
              <MuiLink
                component={RouterLink}
                to="/login"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign In
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
