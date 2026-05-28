"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialTheme,
}: {
    children: React.ReactNode;
    initialTheme: Theme;
}) {
    const [theme, setThemeState] = useState<Theme>(initialTheme);

    useEffect(() => {
        const applyTheme = (currentTheme: Theme) => {
            let isDark = false;
            if (currentTheme === 'system') {
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                isDark = currentTheme === 'dark';
            }
            
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            
            // Dynamically update theme-color meta tag for status bar text color logic
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (!metaThemeColor) {
                metaThemeColor = document.createElement('meta');
                metaThemeColor.setAttribute('name', 'theme-color');
                document.head.appendChild(metaThemeColor);
            }
            metaThemeColor.setAttribute('content', isDark ? '#0B1220' : '#F9FAFB');
        };

        // Apply immediately
        applyTheme(theme);
        localStorage.setItem("user-theme", theme);

        // Listen for OS changes if in system mode
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');

            // Modern event listener support
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
