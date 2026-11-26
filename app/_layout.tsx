import { useEffect, type ReactNode } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/src/context/ThemeProvider';
import { FontScaleProvider } from '@/src/context/FontScaleProvider';
import { I18nProvider } from '@/src/i18n/I18nProvider';
import { UpdateProvider } from '@/src/updates';
import { handleNotificationAction, initNotifications, rescheduleAllNotifications } from '@/src/notifications';
import { ensureRecurringTasks } from '@/src/utils/recurringUtils';
import { useResponsive } from '@/src/theme';

const TASK_ACTIONS = ['complete', 'postpone_ten', 'postpone_hour', 'postpone_day'];

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function ThemedGestureRoot({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>
      {children}
    </GestureHandlerRootView>
  );
}

/**
 * Edge-to-edge on phones; a centered, readable column on tablets and desktop.
 * The Redmi Note 8 (393dp) is still the reference, not a hard maximum.
 */
function AppFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const responsive = useResponsive();
  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: theme.background,
          maxWidth: responsive.contentWidth,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' ? { justifyContent: 'center' as const } : {}),
  },
  frame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  // Preload the Arabic font in the background. The UI is never blocked on it:
  // expo-font re-renders automatically once the font is available, so the app
  // opens immediately with no splash/loading screen.
  useFonts({
    'Cairo': Cairo_400Regular,
    'Cairo-SemiBold': Cairo_600SemiBold,
    'Cairo-Bold': Cairo_700Bold,
  });

  useEffect(() => {
    (async () => {
      try {
        await ensureRecurringTasks();
      } catch {
        // Recurring generation is retried on the next focus/foreground event.
      }
      await initNotifications().catch(() => {});
    })();
  }, []);

  // Overdue/nudge notifications depend on today's data. Reconcile them every
  // time the app returns to the foreground so cancelled tasks never leave
  // stale alerts behind.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void ensureRecurringTasks()
          .then(() => rescheduleAllNotifications())
          .catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { taskId?: string; type?: string }
        | undefined;
      const actionId = response.actionIdentifier;
      if (!data) return;
      if (TASK_ACTIONS.includes(actionId)) {
        if (data.taskId) handleNotificationAction(actionId, data.taskId).catch(() => {});
        return;
      }
      if (data.type === 'overdue_check') {
        router.push('/tasks');
        return;
      }
      // Tapping the notification body opens the related task directly.
      if (data.taskId) router.push(`/tasks/${data.taskId}`);
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <ThemeProvider>
      <FontScaleProvider>
        <I18nProvider initialLanguage="ar">
          <ThemedGestureRoot>
            <SafeAreaProvider>
              <ErrorBoundary>
                <UpdateProvider>
                  <AppFrame>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                        animationDuration: 160,
                      }}
                    >
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <AppStatusBar />
                  </AppFrame>
                </UpdateProvider>
              </ErrorBoundary>
            </SafeAreaProvider>
          </ThemedGestureRoot>
        </I18nProvider>
      </FontScaleProvider>
    </ThemeProvider>
  );
}
