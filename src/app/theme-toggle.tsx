"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const ICONS: Record<Theme, string> = {
  system: "💻",
  light: "☀️",
  dark: "🌙",
};

const LABELS: Record<Theme, string> = {
  system: "Auto",
  light: "Chiaro",
  dark: "Scuro",
};

const CYCLE: Theme[] = ["system", "dark", "light"];

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  if (theme === "dark") {
    el.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    el.setAttribute("data-theme", "light");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    el.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // localStorage is only readable client-side; syncing here (instead of a
    // lazy useState initializer) avoids a server/client hydration mismatch —
    // the flash-free <head> script already paints the right theme before this runs.
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && CYCLE.includes(saved)) setTheme(saved);
    } catch {}
  }, []);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
    applyTheme(next);
  }

  return (
    <button
      onClick={cycle}
      title={`Tema: ${LABELS[theme]}`}
      className="btn-ghost px-2 py-1 text-xs gap-1"
    >
      <span>{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  );
}
