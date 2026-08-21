'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState('dark');

  function applyTheme(nextTheme) {
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('amtai-theme', nextTheme);
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('amtai-theme') || 'dark';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  return (
    <button
      className={`theme-toggle ${className}`}
      type="button"
      aria-label="Өнгөний горим солих"
      onClick={() => {
        const nextTheme = (document.documentElement.dataset.theme || theme) === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
