import { createTheme } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: { main: "#4F46E5", dark: "#3730A3", light: "#818CF8" },
      secondary: { main: "#7C3AED" },
      background: {
        default: mode === "light" ? "#F8FAFC" : "#0F1117",
        paper: mode === "light" ? "#FFFFFF" : "#1A1D27",
      },
      text: {
        primary: mode === "light" ? "#172033" : "#E2E8F0",
        secondary: mode === "light" ? "#64748B" : "#94A3B8",
      },
      divider: mode === "light" ? "#E2E8F0" : "#2D3148",
      success: { main: "#16A34A" },
      warning: { main: "#F59E0B" },
      error: { main: "#DC2626" },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 600 },
          containedPrimary: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: mode === "light" ? "0 1px 3px rgba(0,0,0,.08)" : "0 1px 4px rgba(0,0,0,.4)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { borderRight: "1px solid", borderColor: mode === "light" ? "#E2E8F0" : "#2D3148" },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: "none", boxShadow: "0 1px 0 rgba(0,0,0,.06)" },
        },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: "none", fontWeight: 500 } },
      },
    },
  });

