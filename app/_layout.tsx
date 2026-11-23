import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { ThemeProvider } from '@/src/context/ThemeProvider';
import { FontScaleProvider } from '@/src/context/FontScaleProvider';
import { I18nProvider } from '@/src/i18n/I18nProvider';
import { UpdateProvider } from '@/src/updates';
import { handleNotificationAction, initNotifications } from '@/src/notifications';

const TASK_ACTIONS = ['complete', 'postpone_hour', 'postpone_day'];

export default function RootLayout() {
  useFrameworkReady();

  // Preload the Arabic font in the background. The UI is never blocked on it:
  // expo-font re-renders automatically once the font is available, so the app
  // opens immediately with no splash/loading screen.
  useFonts({
    'Cairo': Cairo_400Regular,
    'Cairo-SemiBold': Cairo_600SemiBold,
    'Cairo-Bold': Cairo_700Bold,
  });

  useEffect(() => {
    initNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { taskId?: string } | undefined;
      const actionId = response.actionIdentifier;
      if (data?.taskId && TASK_ACTIONS.includes(actionId)) {
        handleNotificationAction(actionId, data.taskId).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <ErrorBoundary>
      <ThemeProvider>
        <FontScaleProvider>
        <I18nProvider initialLanguage="ar">
          <UpdateProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 220,
              }}
            >
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </UpdateProvider>
        </I18nProvider>
        </FontScaleProvider>
      </ThemeProvider>
      </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
