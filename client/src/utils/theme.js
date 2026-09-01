// ---------------------------------------------------------------------------
// Attend+ theme helper
// ---------------------------------------------------------------------------
// One source of truth for light/dark mode so the choice applies everywhere —
// Landing, Login, Signup, and both dashboards — instead of each page keeping
// its own separate on/off switch.

const THEME_KEY = 'attendplus_theme';

export function getTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return 'light';
}

export function applyTheme(theme) {
  try { document.documentElement.setAttribute('data-theme', theme); } catch {}
}

export function setTheme(theme) {
  try { window.localStorage.setItem(THEME_KEY, theme); } catch {}
  applyTheme(theme);
  try { window.dispatchEvent(new CustomEvent('attendplus-theme-change', { detail: theme })); } catch {}
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
