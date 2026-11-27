import { useEffect, useRef, type ReactNode } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ActivityIndicator, AppState, InteractionManager, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { AuthProvider, ThemeProvider, useAuth, useTheme } from '@/src/context';
import { FontScaleProvider } from '@/src/context/FontScaleProvider';
import { I18nProvider } from '@/src/i18n/I18nProvider';
import { UpdateProvider } from '@/src/updates';
import {
  handleNotificationAction,
  initNotifications,
  markNotificationsDirty,
  needsFullNotificationReschedule,
  refreshTaskDerivedNotifications,
  rescheduleAllNotifications,
} from '@/src/notifications';
import { ensureRecurringTasks } from '@/src/utils/recurringUtils';
import { spacing, useResponsive } from '@/src/theme';

const TASK_ACTIONS = ['complete', 'postpone_ten', 'postpone_hour', 'postpone_day'];

function BootScreen() {
  return (
    <View style={styles.boot}>
      <Text style={styles.bootTitle}>Orbit</Text>
      <ActivityIndicator color="#1A9FE8" />
    </View>
  );
}

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
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: theme.background,
          maxWidth: responsive.contentWidth,
          // Landscape cutouts consume horizontal space; keep all screen
          // content clear of them without changing portrait layout.
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Mounts data-owning providers only after the account namespace is known. */
function AppProviders() {
  const { ready, authKey } = useAuth();
  const router = useRouter();
  const foregroundWork = useRef<{ cancel: () => void } | null>(null);

  // Preload the Arabic font in the background. The UI is never blocked on it:
  // expo-font re-renders automatically once the font is available, so the app
  // opens immediately with no splash/loading screen.
  useFonts({
    'Cairo': Cairo_400Regular,
    'Cairo-SemiBold': Cairo_600SemiBold,
    'Cairo-Bold': Cairo_700Bold,
  });

  useEffect(() => {
    if (!ready) return;
    // Keep first paint and the first tap responsive: recurring generation and
    // native notification setup are idle work, not startup blockers.
    const handle = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          await ensureRecurringTasks();
        } catch {
          // Recurring generation is retried on the next focus/foreground event.
        }
        await initNotifications().catch(() => {});
      })();
    });
    return () => handle.cancel();
  }, [ready, authKey]);

  // Overdue/nudge notifications depend on today's data. Reconcile them every
  // time the app returns to the foreground so cancelled tasks never leave
  // stale alerts behind.
  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      foregroundWork.current?.cancel();
      foregroundWork.current = InteractionManager.runAfterInteractions(() => {
        void (async () => {
          const created = await ensureRecurringTasks();
          if (created > 0) markNotificationsDirty();
          if (needsFullNotificationReschedule()) {
            await rescheduleAllNotifications();
          } else {
            // Overdue/nudge content still depends on the current day, but a
            // full native reschedule would be wasted work.
            await refreshTaskDerivedNotifications();
          }
        })().catch(() => {});
      });
    });
    return () => {
      subscription.remove();
      foregroundWork.current?.cancel();
    };
  }, [ready, authKey]);

  useEffect(() => {
    if (!ready) return;
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
  }, [ready, router]);

  if (!ready) return <BootScreen />;

  return (
    <ThemeProvider key={authKey}>
      <FontScaleProvider key={`font-${authKey}`}>
        <I18nProvider key={`i18n-${authKey}`} initialLanguage="ar">
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

export default function RootLayout() {
  useFrameworkReady();
  return (
    <AuthProvider>
      <AppProviders />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  bootTitle: {
    fontSize: 28,
    color: '#1A9FE8',
    fontWeight: '700',
  },
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
