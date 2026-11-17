"use client";

import { useLayoutEffect } from "react";

const STORAGE_KEY = "theme";

function effectiveTheme(): "light" | "dark" {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Flips data-theme on <html>; the inline script in the root layout applies
 * the stored choice before first paint, and CSS (.light-only / .dark-only)
 * picks the label, so no client state or hydration mismatch is involved.
 */
export function ThemeToggle() {
  // Dev only: React Strict Mode's remount resets <html> to its JSX
  // attributes, dropping what the inline script set. Re-apply before paint.
  useLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const toggle = () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title="Switch theme"
      aria-label="Switch between light and dark"
      className="btn btn-line px-4 text-sm"
    >
      <span className="light-only">Switch to dark</span>
      <span className="dark-only">Switch to light</span>
    </button>
  );
}
