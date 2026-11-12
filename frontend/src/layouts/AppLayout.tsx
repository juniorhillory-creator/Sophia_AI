import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, Avatar, Menu, MenuItem, Divider,
  Tooltip, useTheme, useMediaQuery,
} from "@mui/material";
import {
  MenuRounded, DashboardRounded, LibraryBooksRounded, AddCircleOutlineRounded,
  SettingsRounded, Brightness4Rounded, Brightness7Rounded, LogoutRounded,
  AccountCircleRounded, AutoStoriesRounded,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Dashboard", icon: <DashboardRounded />, path: "/" },
  { label: "My Research", icon: <LibraryBooksRounded />, path: "/research" },
  { label: "Settings", icon: <SettingsRounded />, path: "/settings" },
];

function SophiaLogo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 2 }}>
      <AutoStoriesRounded sx={{ color: "primary.main", fontSize: 28 }} />
      <Typography variant="h6" fontWeight={700} color="primary.main" letterSpacing={-0.5}>
        Sophia AI
      </Typography>
    </Box>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SophiaLogo />
      <Divider />
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={() => { navigate("/"); onClose?.(); }}
          sx={{
            borderRadius: 2, bgcolor: "primary.main", color: "white",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
            <AddCircleOutlineRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="New Research" primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
        </ListItemButton>
      </Box>
      <List sx={{ px: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              onClick={onClose}
              selected={active}
              sx={{
                borderRadius: 2, mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: "primary.main" + "18",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate("/auth/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop drawer */}
      {!isMobile && (
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}>
          <SidebarContent />
        </Drawer>
      )}
      {/* Mobile drawer */}
      {isMobile && (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}>
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" elevation={0}>
          <Toolbar sx={{ gap: 1 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} edge="start">
                <MenuRounded />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
              <IconButton onClick={toggle} size="small">
                {mode === "light" ? <Brightness4Rounded /> : <Brightness7Rounded />}
              </IconButton>
            </Tooltip>
            {isAuthenticated ? (
              <>
                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>
                    {user?.username?.[0]?.toUpperCase() ?? "U"}
                  </Avatar>
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                  <MenuItem disabled>
                    <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { setAnchorEl(null); navigate("/settings"); }}>
                    <ListItemIcon><AccountCircleRounded fontSize="small" /></ListItemIcon>
                    Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <ListItemButton sx={{ borderRadius: 2, px: 2, py: 0.5 }} onClick={() => navigate("/auth/login")}>
                <Typography variant="body2" fontWeight={600} color="primary.main">Sign in</Typography>
              </ListItemButton>
            )}
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, maxWidth: "100%" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

