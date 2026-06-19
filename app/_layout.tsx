import { rtdb } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, DarkTheme as NavDarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { off, onDisconnect, onValue, ref, set } from 'firebase/database';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Keep splash screen visible until fonts load
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function InnerLayout() {
  const { isDark } = useTheme();

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Global Presence Tracker
  useEffect(() => {
    let presenceRef: any = null;
    let connectedRef: any = null;

    const setupPresence = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const u = JSON.parse(userData);
          presenceRef = ref(rtdb, `presence/${u.uid}`);
          connectedRef = ref(rtdb, '.info/connected');

          onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
              onDisconnect(presenceRef).remove().then(() => {
                set(presenceRef, true);
              });
            }
          });
        }
      } catch (err) { }
    };

    setupPresence();

    return () => {
      if (connectedRef) off(connectedRef);
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavThemeProvider value={isDark ? NavDarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/signup" />
          <Stack.Screen name="(auth)/approval" />
          <Stack.Screen name="teacher/index" />
          <Stack.Screen name="teacher/courses" />
          <Stack.Screen name="teacher/courses/[id]" />
          <Stack.Screen name="teacher/live" />
          <Stack.Screen name="teacher/students" />
          <Stack.Screen name="teacher/announcements" />
          <Stack.Screen name="teacher/assignments" />
          <Stack.Screen name="teacher/social" />
          <Stack.Screen name="teacher/finance" />
          <Stack.Screen name="principal/index" />
          <Stack.Screen name="student/index" />
          <Stack.Screen name="student/courses/[id]" />
          <Stack.Screen name="student/homework" />
          <Stack.Screen name="student/live" />
          <Stack.Screen name="student/social" />
          <Stack.Screen name="student/explore" />
          <Stack.Screen name="student/my-courses" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </NavThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <InnerLayout />
    </ThemeProvider>
  );
}

