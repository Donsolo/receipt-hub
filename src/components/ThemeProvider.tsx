"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from '@capacitor/core';

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
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored === 'light' || stored === 'dark' || stored === 'system') return stored as Theme;
            return 'system';
        }
        return initialTheme;
    });

    const [resolvedIsDark, setResolvedIsDark] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const storedTheme = localStorage.getItem('theme') || 'system';
            if (storedTheme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            return storedTheme === 'dark';
        }
        return initialTheme === 'dark';
    });

    useEffect(() => {
        const migrated = localStorage.getItem('theme_migrated_v2');
        if (!migrated) {
            localStorage.removeItem('theme');
            localStorage.removeItem('user-theme');
            localStorage.setItem('theme_migrated_v2', 'true');
        }
    }, []);

    useEffect(() => {
        const applyTheme = (currentTheme: Theme) => {
            let isDark = false;
            if (currentTheme === 'system') {
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                isDark = currentTheme === 'dark';
            }
            
            setResolvedIsDark(isDark);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            
            // DO NOT update theme-color meta tag on Native platforms 
            // because Capacitor automatically intercepts it and calls 
            // StatusBar.setBackgroundColor, destroying our transparent overlay!
            if (!Capacitor.isNativePlatform()) {
                let metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (!metaThemeColor) {
                    metaThemeColor = document.createElement('meta');
                    metaThemeColor.setAttribute('name', 'theme-color');
                    document.head.appendChild(metaThemeColor);
                }
                metaThemeColor.setAttribute('content', isDark ? '#0B1220' : '#ffffff');
            }
        };

        // Apply immediately
        applyTheme(theme);
        if (theme === 'system') {
            localStorage.removeItem("theme");
            localStorage.removeItem("user-theme");
        } else {
            localStorage.setItem("theme", theme);
        }

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
