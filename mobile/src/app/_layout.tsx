import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="classes" options={{ headerShown: false }} />
          <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="assignment/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="class/[id]/assignment/[assignmentId]/gradebook"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="learning-history" options={{ headerShown: false }} />
          <Stack.Screen
            name="learning-history/[sessionId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reminder-settings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="achievements"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="weak-words" options={{ headerShown: false }} />
          <Stack.Screen name="review/weak" options={{ headerShown: false }} />
          <Stack.Screen name="study-set/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="study-set/[id]/flashcards"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="study-set/[id]/learn"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="study-set/[id]/match"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="study-set/[id]/test"
            options={{ headerShown: false }}
          />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
