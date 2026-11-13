import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Divider,
  Avatar,
  Stack,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import StorageIcon from '@mui/icons-material/Storage';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useThemeContext } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

export const SettingsPage: React.FC = () => {
  const { mode, toggleTheme } = useThemeContext();
  const { user, logout } = useAuth();

  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:8000'
      : 'https://sophia-ai.onrender.com');

  useEffect(() => {
    const checkBackend = async () => {
      const startTime = performance.now();
      try {
        await axiosInstance.get('/health', { timeout: 6000 });
        setLatency(Math.round(performance.now() - startTime));
        setBackendStatus('online');
      } catch {
        try {
          // Fallback check to /api/v1/documents
          await axiosInstance.get('/api/v1/documents', { timeout: 6000 });
          setLatency(Math.round(performance.now() - startTime));
          setBackendStatus('online');
        } catch {
          setBackendStatus('offline');
        }
      }
    };

    checkBackend();
  }, []);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
        Settings & Preferences
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
        Manage your user profile, appearance, and backend environment connection.
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              {mode === 'dark' ? (
                <DarkModeIcon sx={{ color: 'primary.main' }} />
              ) : (
                <LightModeIcon sx={{ color: 'warning.main' }} />
              )}
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Theme & Appearance
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Select your interface color scheme. Sophia AI adapts contrast for reading academic research.
            </Typography>

            <RadioGroup
              value={mode}
              onChange={(e) => {
                if (e.target.value !== mode) toggleTheme();
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: mode === 'light' ? 'primary.main' : 'divider',
                  bgcolor: mode === 'light' ? 'rgba(79, 70, 229, 0.04)' : 'transparent',
                }}
              >
                <FormControlLabel
                  value="light"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Light Mode
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Clean slate with indigo highlights
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: mode === 'dark' ? 'primary.main' : 'divider',
                  bgcolor: mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                }}
              >
                <FormControlLabel
                  value="dark"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Dark Mode
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Deep slate optimized for long reading sessions
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </RadioGroup>
          </Paper>
        </Grid>

        {/* Backend & Environment */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <StorageIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                API & Environment
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Connected FastAPI backend and AI processing engine status.
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                CONFIGURED API ENDPOINT
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mt: 0.5,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                }}
              >
                {apiBaseUrl}
              </Paper>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                FastAPI Health Status
              </Typography>
              {backendStatus === 'online' ? (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                  label={`Connected (${latency}ms)`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              ) : backendStatus === 'offline' ? (
                <Chip
                  icon={<ErrorOutlineIcon sx={{ fontSize: '1rem !important' }} />}
                  label="Unreachable"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              ) : (
                <Chip label="Pinging API..." size="small" variant="outlined" />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                AI Model Engine
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Gemini 2.5 Flash + Supabase
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* User Account Details */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <PersonOutlineIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Account Information
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'primary.main',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {user?.username || 'Researcher'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {user?.email || 'researcher@sophia.ai'}
                  </Typography>
                  {user?.id && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.disabled',
                        fontFamily: 'monospace',
                        display: 'block',
                        mt: 0.25,
                      }}
                    >
                      User ID: {user.id}
                    </Typography>
                  )}
                </Box>
              </Stack>

              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={logout}
                sx={{ fontWeight: 600 }}
              >
                Sign Out
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
