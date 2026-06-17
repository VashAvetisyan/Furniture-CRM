'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores';

export default function ThemeProvider() {
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return null;
}
