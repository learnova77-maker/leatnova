import { Platform } from 'react-native';

export const Colors = {
  primary: '#00AEEF',
  secondary: '#002A3A',
  white: '#FFFFFF',
  grey: '#bdc8d1',
  lightGrey: '#353535',
  light: {
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    card: '#FFFFFF',
    tint: '#00AEEF',
    icon: '#4B5563',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#00AEEF',
    headerBg: '#FFFFFF',
    sidebarBg: '#FFFFFF',
  },
  dark: {
    text: '#E2E2E2',
    textSecondary: 'rgba(226, 226, 226, 0.4)',
    background: '#000000',
    surface: '#0A0A0A',
    border: 'rgba(255, 255, 255, 0.08)',
    card: 'rgba(255, 255, 255, 0.03)',
    tint: '#00AEEF',
    icon: '#87929b',
    tabIconDefault: '#87929b',
    tabIconSelected: '#00AEEF',
    headerBg: '#000000',
    sidebarBg: '#050505',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
