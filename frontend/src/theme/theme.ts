import { createTheme, type ThemeOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    border: string;
  }
  interface PaletteOptions {
    border?: string;
  }
}

const getDesignTokens = (mode: "light" | "dark"): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: "#4F46E5",
      light: "#818CF8",
      dark: "#3730A3",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#7C3AED",
      light: "#A78BFA",
      dark: "#5B21B6",
      contrastText: "#FFFFFF",
    },
    background: {
      default: mode === "light" ? "#F8FAFC" : "#0B0F19",
      paper: mode === "light" ? "#FFFFFF" : "#111827",
    },
    text: {
      primary: mode === "light" ? "#0F172A" : "#F1F5F9",
      secondary: mode === "light" ? "#64748B" : "#94A3B8",
    },
    border: mode === "light" ? "#E2E8F0" : "#1E293B",
    divider: mode === "light" ? "#E2E8F0" : "#1E293B",
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.025em" },
    h2: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em" },
    h4: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.02em" },
    h5: { fontSize: "1.1rem", fontWeight: 600 },
    h6: { fontSize: "0.95rem", fontWeight: 600 },
    body1: { fontSize: "0.925rem", lineHeight: 1.6 },
    body2: { fontSize: "0.85rem", lineHeight: 1.55 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          fontWeight: 600,
          padding: "8px 16px",
          transition: "all 0.15s ease-in-out",
          "&:hover": {
            boxShadow: mode === "light" 
              ? "0 4px 12px rgba(79, 70, 229, 0.15)"
              : "0 4px 12px rgba(129, 140, 248, 0.2)",
          },
        },
        containedPrimary: {
          backgroundColor: "#4F46E5",
          "&:hover": {
            backgroundColor: "#4338CA",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${mode === "light" ? "#E2E8F0" : "#1E293B"}`,
          boxShadow: mode === "light"
            ? "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)"
            : "0 1px 3px rgba(0,0,0,0.3)",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.9rem",
          minHeight: 44,
        },
      },
    },
  },
});

export const createAppTheme = (mode: "light" | "dark") =>
  createTheme(getDesignTokens(mode));
