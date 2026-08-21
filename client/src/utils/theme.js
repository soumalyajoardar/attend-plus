// ---------------------------------------------------------------------------
// Attend+ theme helper
// ---------------------------------------------------------------------------
// One source of truth for light/dark mode so the choice applies everywhere —
// Landing, Login, Signup, and both dashboards — instead of each page keeping
// its own separate on/off switch.

const THEME_KEY = 'attendplus_theme';

export function getTheme() {
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  // Default to light regardless of OS/browser preference — the site should
  // always open in light mode unless the person explicitly switches it.
  return 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme) {
  window.localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  // Let any other mounted component (e.g. a toggle on another tab/page) know.
  window.dispatchEvent(new CustomEvent('attendplus-theme-change', { detail: theme }));
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

// Applies the saved/preferred theme immediately — call once as early as
// possible (main.jsx) so there's no flash of the wrong theme on load.
export function initTheme() {
  applyTheme(getTheme());
}
