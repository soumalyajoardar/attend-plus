import React, { useEffect, useState } from 'react';
import { IconMoon, IconSun } from './Icons';
import { getTheme, toggleTheme } from '../utils/theme';

// A small icon-only toggle. Renders consistently everywhere it's dropped in,
// and stays in sync even if the theme is changed from another instance of
// this component elsewhere on the page (or another tab via storage events).
const ThemeToggle = ({ className = '' }) => {
  const [theme, setThemeState] = useState(getTheme());

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    const onStorage = (e) => {
      if (e.key === 'attendplus_theme') setThemeState(getTheme());
    };
    window.addEventListener('attendplus-theme-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('attendplus-theme-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleClick = () => setThemeState(toggleTheme());

  return (
    <button
      type="button"
      className={`ap-theme-toggle ${className}`}
      onClick={handleClick}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
};

export default ThemeToggle;
