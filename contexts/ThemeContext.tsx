import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeColors {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    accent: string;
    inputBg: string;
    headerBg: string;
    sidebarBg: string;
    overlay: string;
    danger: string;
    success: string;
    icon: string;
    iconActive: string;
    shadow: string;
}

const LightTheme: ThemeColors = {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    border: '#F0F0F0',
    primary: '#00AEEF',
    accent: '#00AEEF',
    inputBg: '#F9FAFB',
    headerBg: '#FFFFFF',
    sidebarBg: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.5)',
    danger: '#FF4444',
    success: '#16A34A',
    icon: '#687076',
    iconActive: '#00AEEF',
    shadow: '#000',
};

const DarkTheme: ThemeColors = {
    background: '#0F1117',
    surface: '#1A1D27',
    card: '#222539',
    text: '#EAEDF3',
    textSecondary: '#8B8FA3',
    border: '#2A2D3A',
    primary: '#00AEEF',
    accent: '#00AEEF',
    inputBg: '#050505',
    headerBg: '#000000',
    sidebarBg: '#000000',
    overlay: 'rgba(0,0,0,0.7)',
    danger: '#FF6B6B',
    success: '#4ADE80',
    icon: '#8B8FA3',
    iconActive: '#00AEEF',
    shadow: '#000',
};

interface ThemeContextType {
    mode: ThemeMode;
    colors: ThemeColors;
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    colors: LightTheme,
    isDark: false,
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('light');

    useEffect(() => {
        // Load saved theme preference
        AsyncStorage.getItem('themeMode').then((saved) => {
            if (saved === 'dark' || saved === 'light') {
                setMode(saved);
            }
        });
    }, []);

    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        AsyncStorage.setItem('themeMode', newMode);
    };

    const colors = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    return (
        <ThemeContext.Provider value={{ mode, colors, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export { DarkTheme, LightTheme };
export type { ThemeColors };

