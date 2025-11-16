import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper para obtener la clave de localStorage específica del usuario
const getThemeStorageKey = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const userId = user._id || user.id;
      const userRole = user.role || 'guest';
      return `portal-theme-${userRole}-${userId}`;
    }
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
  }
  return 'portal-theme-guest';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Memoize the theme key to prevent recalculation
  const [themeKey] = useState(() => getThemeStorageKey());

  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first with user-specific key
    const stored = localStorage.getItem(themeKey) as Theme | null;
    if (stored) return stored;

    // Default to light for private areas
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the current theme
    root.classList.add(theme);

    // Save to localStorage with user-specific key
    localStorage.setItem(themeKey, theme);

    // Removed excessive debug logs that were cluttering console
  }, [theme, themeKey]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
