import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const toggleTheme = useCallback(async () => {}, []);

  return (
    <ThemeContext.Provider value={{ isDark: true, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
