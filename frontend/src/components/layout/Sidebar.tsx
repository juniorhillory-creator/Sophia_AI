import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import MenuBookIcon from "@mui/icons-material/MenuBookRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import Button from "@mui/material/Button";
import { alpha, useTheme } from "@mui/material/styles";

export const DRAWER_WIDTH = 260;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  onOpenUpload?: () => void;
}

const NAV_ITEMS = [
  { text: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { text: "My Research", path: "/research", icon: <MenuBookIcon /> },
  { text: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose, onOpenUpload }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            Sophia AI
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
            Research Companion
          </Typography>
        </Box>
      </Box>

      {/* Quick Upload Action */}
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<CloudUploadIcon />}
          onClick={() => {
            if (location.pathname !== "/") {
              navigate("/");
            }
            if (onOpenUpload) onOpenUpload();
            onClose();
          }}
          sx={{
            py: 1.2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          }}
        >
          New Research
        </Button>
      </Box>

      <Divider sx={{ my: 1, borderColor: "divider" }} />

      {/* Navigation List */}
      <List sx={{ px: 1.5, py: 1, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isSelected =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.8 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: 2,
                  color: isSelected ? "primary.main" : "text.secondary",
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                  "&.Mui-selected": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    fontWeight: 600,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.14),
                    },
                  },
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    color: "text.primary",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,
                    color: isSelected ? "primary.main" : "text.secondary",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: "0.9rem",
                    fontWeight: isSelected ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer Info */}
      <Box sx={{ p: 2.5, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
          Sophia AI v2.0
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
          Ground-truth research intelligence
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: 1,
            borderColor: "divider",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

