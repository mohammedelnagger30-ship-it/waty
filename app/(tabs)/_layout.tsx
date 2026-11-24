import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, CheckSquare, Target, BarChart3, Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { settingsRepository, subscribeToSettings } from '@/src/storage';
import type { Settings } from '@/src/storage/entities';
import { spacing } from '@/src/theme';

const TAB_DEFS = [
  { name: 'index', icon: Calendar, label: 'tab.today' },
  { name: 'tasks', icon: CheckSquare, label: 'tab.tasks' },
  { name: 'plans', icon: Target, label: 'tab.plans' },
  { name: 'stats', icon: BarChart3, label: 'tab.stats' },
  { name: 'settings', icon: SettingsIcon, label: 'tab.settings' },
] as const satisfies ReadonlyArray<{
  name: string;
  icon: typeof Calendar;
  label: TranslationKey;
}>;

function normalizedTabOrder(settings?: Pick<Settings, 'tabOrder'> | null): string[] {
  const stored = (settings?.tabOrder ?? []).filter((name) =>
    TAB_DEFS.some((tab) => tab.name === name),
  );
  TAB_DEFS.forEach((tab) => {
    if (!stored.includes(tab.name)) stored.push(tab.name);
  });
  return stored;
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [tabOrder, setTabOrder] = useState<string[]>(TAB_DEFS.map((tab) => tab.name));

  useEffect(() => {
    const unsubscribe = subscribeToSettings((settings) => {
      setTabOrder(normalizedTabOrder(settings));
    });
    void settingsRepository.getOrCreate().then((settings) => {
      setTabOrder(normalizedTabOrder(settings));
    });
    return unsubscribe;
  }, []);

  // Focused tabs get a pill and the tinted label/icon (no indicator dot).
  const tabIcon = (Icon: typeof Calendar) =>
    ({ focused, color }: { focused: boolean; color: string; size: number }) => (
      <View style={[styles.iconWrap, focused && { backgroundColor: theme.primary[500] + '1C' }]}>
        <Icon color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
      </View>
    );

  const orderedTabs = [...TAB_DEFS].sort(
    (a, b) => tabOrder.indexOf(a.name) - tabOrder.indexOf(b.name),
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.tab.active,
          tabBarInactiveTintColor: theme.tab.inactive,
          tabBarAllowFontScaling: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: theme.tab.background,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: (Platform.OS === 'ios' ? 64 : 56) + Math.max(insets.bottom, 0),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4),
            paddingTop: 4,
            paddingHorizontal: spacing.xs,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        }}
      >
        {orderedTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t(tab.label),
              tabBarIcon: tabIcon(tab.icon),
            }}
          />
        ))}
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
