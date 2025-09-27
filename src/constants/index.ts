export const MIN_N = 3;
export const MAX_N = 8;
export const STORAGE_KEY = "grid-games.v1";
export const THEME_KEY = "grid-games.theme";

export const THEMES: string[] = ["light", "dark", "playful", "high-contrast"];

// Theme configurations
export const THEME_CONFIGS = {
  light: {
    "--bg": "#f7f7fb",
    "--panel": "#ffffff",
    "--fg": "#111827",
    "--muted": "#6b7280",
    "--primary": "#2563eb",
    "--accent": "#22c55e",
    "--warn": "#ef4444",
    "--tile": "#eef2ff",
    "--tile-on": "#c7d2fe",
    "--glow": "rgba(37, 99, 235, 0.25)",
  },
  dark: {
    "--bg": "#0b1020",
    "--panel": "#0f172a",
    "--fg": "#e5e7eb",
    "--muted": "#9ca3af",
    "--primary": "#60a5fa",
    "--accent": "#34d399",
    "--warn": "#f87171",
    "--tile": "#111827",
    "--tile-on": "#1f2937",
    "--glow": "rgba(96, 165, 250, 0.3)",
  },
  playful: {
    "--bg": "linear-gradient(135deg, #fff1f2, #eff6ff)",
    "--panel": "#ffffffaa",
    "--fg": "#0f172a",
    "--muted": "#475569",
    "--primary": "#a78bfa",
    "--accent": "#f43f5e",
    "--warn": "#ef4444",
    "--tile": "#f5f3ff",
    "--tile-on": "#e9d5ff",
    "--glow": "rgba(167,139,250,0.35)",
  },
  "high-contrast": {
    "--bg": "#000000",
    "--panel": "#000000",
    "--fg": "#ffffff",
    "--muted": "#d1d5db",
    "--primary": "#ffffff",
    "--accent": "#00ff00",
    "--warn": "#ff0033",
    "--tile": "#000000",
    "--tile-on": "#ffffff11",
    "--glow": "rgba(255,255,255,0.4)",
  },
} as const;
