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
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first with user-specific key
    const themeKey = getThemeStorageKey();
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
    const themeKey = getThemeStorageKey();
    localStorage.setItem(themeKey, theme);

    // Debug log
    console.log('🎨 Theme changed to:', theme, 'for key:', themeKey);
    console.log('🎨 HTML classes:', root.className);

    // Cleanup on unmount - remove theme classes when leaving private area
    return () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      console.log('🎨 Theme cleanup - removed classes');
    };
  }, [theme]);

  // Additional cleanup effect on mount/unmount
  useEffect(() => {
    return () => {
      // Force cleanup when ThemeProvider unmounts
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      console.log('🎨 ThemeProvider unmounted - forced cleanup');
    };
  }, []);

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
