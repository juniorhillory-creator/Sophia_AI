import React, { createContext, useContext, useState, useMemo } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { getTheme } from "../theme/theme";

interface ThemeCtx { mode: "light" | "dark"; toggle: () => void; }
const ThemeCtx = createContext<ThemeCtx>({ mode: "light", toggle: () => {} });

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("sophia_theme") as "light" | "dark") || "light";
  });

  const toggle = () => {
    const next = mode === "light" ? "dark" : "light";
    localStorage.setItem("sophia_theme", next);
    setMode(next);
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

export function useThemeMode() { return useContext(ThemeCtx); }

