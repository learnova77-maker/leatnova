import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen name="(auth)/approval" />
        <Stack.Screen name="teacher/index" />
        <Stack.Screen name="teacher/courses" />
        <Stack.Screen name="teacher/live" />
        <Stack.Screen name="teacher/students" />
        <Stack.Screen name="teacher/announcements" />
        <Stack.Screen name="teacher/lectures" />
        <Stack.Screen name="teacher/homework" />
        <Stack.Screen name="teacher/resources" />
        <Stack.Screen name="student/index" />
        <Stack.Screen name="student/videos" />
        <Stack.Screen name="student/live" />
        <Stack.Screen name="student/quizzes" />
        <Stack.Screen name="student/social" />
        <Stack.Screen name="student/progress" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
