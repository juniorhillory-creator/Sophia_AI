import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Button from "@mui/material/Button";
import MenuIcon from "@mui/icons-material/MenuRounded";
import LightModeIcon from "@mui/icons-material/LightModeRounded";
import DarkModeIcon from "@mui/icons-material/DarkModeRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import LoginIcon from "@mui/icons-material/LoginRounded";
import PersonIcon from "@mui/icons-material/PersonRounded";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { DRAWER_WIDTH } from "./Sidebar";

interface TopbarProps {
  onMobileDrawerToggle: () => void;
  title?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileDrawerToggle, title }) => {
  const { mode, toggleTheme } = useAppTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate("/login");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 3.5 } }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMobileDrawerToggle}
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1, fontSize: "1.1rem" }}>
          {title || "Sophia AI"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Theme Switcher */}
          <Tooltip title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
            <IconButton onClick={toggleTheme} color="inherit" size="small">
              {mode === "light" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* User Account / Profile */}
          {isAuthenticated ? (
            <>
              <Tooltip title="Account menu">
                <IconButton onClick={handleProfileMenuOpen} size="small" sx={{ ml: 1 }}>
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "primary.main",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {user?.username ? user.username.charAt(0).toUpperCase() : <PersonIcon fontSize="small" />}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                PaperProps={{
                  sx: {
                    width: 200,
                    mt: 1.5,
                    borderRadius: 2,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {user?.username || "Researcher"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {user?.email || "researcher@sophia.local"}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/settings");
                  }}
                >
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                  <ListItemIcon sx={{ color: "error.main" }}>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="outlined"
              size="small"
              startIcon={<LoginIcon />}
              onClick={() => navigate("/login")}
              sx={{ ml: 1 }}
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

