export interface Theme {
  name: string;
  colors: {
    bgApp: string;
    bgPanel: string;
    fgPrimary: string;
    fgSecondary: string;
    border: string;
    accent: string;
    accentHover: string;
  };
}

export const THEMES: Record<string, Theme> = {
  default: {
    name: "Default (Slate)",
    colors: {
      bgApp: "#0f172a",
      bgPanel: "#1e293b",
      fgPrimary: "#e2e8f0",
      fgSecondary: "#94a3b8",
      border: "#334155",
      accent: "#6366f1", // indigo-500
      accentHover: "#4f46e5", // indigo-600
    },
  },
  retro: {
    name: "Retro Terminal",
    colors: {
      bgApp: "#0a0a0a",
      bgPanel: "#141414",
      fgPrimary: "#33ff33",
      fgSecondary: "#1f8f1f",
      border: "#1f8f1f",
      accent: "#33ff33",
      accentHover: "#29cc29",
    },
  },
  cyberpunk: {
    name: "Cyberpunk",
    colors: {
      bgApp: "#050510",
      bgPanel: "#0b0b1a",
      fgPrimary: "#e0e0e0",
      fgSecondary: "#ff00ff",
      border: "#00ffff",
      accent: "#fcee0a",
      accentHover: "#e6d600",
    },
  },
  postApocalyptic: {
    name: "Post-Apocalyptic",
    colors: {
      bgApp: "#1c1917",
      bgPanel: "#292524",
      fgPrimary: "#d6d3d1",
      fgSecondary: "#78716c",
      border: "#44403c",
      accent: "#f59e0b",
      accentHover: "#d97706",
    },
  },
  synthNoir: {
    name: "Synth-Noir",
    colors: {
      bgApp: "#050505",
      bgPanel: "#120518",
      fgPrimary: "#e0e0e0",
      fgSecondary: "#bc13fe",
      border: "#2e0a42",
      accent: "#00f3ff",
      accentHover: "#00c4cf",
    },
  },
  dieselpunk: {
    name: "Dieselpunk",
    colors: {
      bgApp: "#121212",
      bgPanel: "#1f1e1d",
      fgPrimary: "#c0b0a0",
      fgSecondary: "#7d7060",
      border: "#5c5040",
      accent: "#e0bd8c",
      accentHover: "#c2a276",
    },
  },
  steampunkGrime: {
    name: "Steampunk Grime",
    colors: {
      bgApp: "#1a1510",
      bgPanel: "#261f18",
      fgPrimary: "#d4c5b0",
      fgSecondary: "#8c7b65",
      border: "#4a3c31",
      accent: "#cd7f32",
      accentHover: "#b87333",
    },
  },
  darkFantasy: {
    name: "Dark Fantasy",
    colors: {
      bgApp: "#02040a",
      bgPanel: "#0f111a",
      fgPrimary: "#cbd5e1",
      fgSecondary: "#64748b",
      border: "#1e293b",
      accent: "#a855f7",
      accentHover: "#9333ea",
    },
  },
  occultIndustrial: {
    name: "Occult Industrial",
    colors: {
      bgApp: "#0a0000",
      bgPanel: "#1a0505",
      fgPrimary: "#d1d5db",
      fgSecondary: "#7f1d1d",
      border: "#450a0a",
      accent: "#dc2626",
      accentHover: "#b91c1c",
    },
  },
  gothicTech: {
    name: "Gothic Tech",
    colors: {
      bgApp: "#000000",
      bgPanel: "#111111",
      fgPrimary: "#ffffff",
      fgSecondary: "#525252",
      border: "#333333",
      accent: "#ffffff",
      accentHover: "#d4d4d4",
    },
  },
  analogHorror: {
    name: "Analog Horror",
    colors: {
      bgApp: "#080808",
      bgPanel: "#141414",
      fgPrimary: "#d4d4d4",
      fgSecondary: "#525252",
      border: "#404040",
      accent: "#404040", // Low contrast styling
      accentHover: "#525252",
    },
  },
  vaporwaveDecay: {
    name: "Vaporwave Decay",
    colors: {
      bgApp: "#181020",
      bgPanel: "#241830",
      fgPrimary: "#ff99cc",
      fgSecondary: "#99ccff",
      border: "#4d2a66",
      accent: "#00ffff",
      accentHover: "#00cccc",
    },
  },
  neonDystopia: {
    name: "Neon Dystopia",
    colors: {
      bgApp: "#010806",
      bgPanel: "#041410",
      fgPrimary: "#e2e8f0",
      fgSecondary: "#00ff99",
      border: "#052e24",
      accent: "#ff0055",
      accentHover: "#cc0044",
    },
  },
  urbanRuin: {
    name: "Urban Ruin",
    colors: {
      bgApp: "#18181b",
      bgPanel: "#27272a",
      fgPrimary: "#a1a1aa",
      fgSecondary: "#52525b",
      border: "#3f3f46",
      accent: "#10b981", // Moss green hint
      accentHover: "#059669",
    },
  },
  biomech: {
    name: "Biomech",
    colors: {
      bgApp: "#050a05",
      bgPanel: "#0d1a0d",
      fgPrimary: "#c9dbc9",
      fgSecondary: "#4d7a4d",
      border: "#264026",
      accent: "#ef4444", // Organic alert red
      accentHover: "#dc2626",
    },
  },
  corruptedUtopia: {
    name: "Corrupted Utopia",
    colors: {
      bgApp: "#0f0f12",
      bgPanel: "#1a1a24",
      fgPrimary: "#f8fafc",
      fgSecondary: "#06b6d4",
      border: "#1e1e2e",
      accent: "#f43f5e",
      accentHover: "#e11d48",
    },
  },
};