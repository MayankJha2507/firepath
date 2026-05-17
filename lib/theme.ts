export type Theme = "dark" | "light" | "system";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
  }
  localStorage.setItem("firepath-theme", theme);
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem("firepath-theme") as Theme) ?? "light";
}
