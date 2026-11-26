import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, CheckSquare, Target, BarChart3, Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { settingsRepository, subscribeToSettings } from '@/src/storage';
import type { Settings } from '@/src/storage/entities';
import { spacing, iconSize, iconStroke, useResponsive } from '@/src/theme';

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

type TabIconProps = {
  Icon: typeof Calendar;
  focused: boolean;
  color: string;
  activeColor: string;
};

/** Stable component identity keeps icons mounted across layout re-renders. */
function TabIcon({ Icon, focused, color, activeColor }: TabIconProps) {
  const responsive = useResponsive();
  return (
    <View
      style={[
        styles.iconWrap,
        responsive.isWide && styles.iconWrapWide,
        focused && {
          backgroundColor: activeColor + '1C',
          borderColor: activeColor + '33',
        },
      ]}
    >
      <Icon
        color={color}
        size={iconSize.xl}
        strokeWidth={focused ? iconStroke.emphasis : iconStroke.regular}
      />
    </View>
  );
}

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
  const responsive = useResponsive();
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

  // Stable icon renderers: a new anonymous component type would remount all
  // five tab icons on every layout re-render.
  const tabIcons = useMemo(() => {
    const icons = {} as Record<
      string,
      (props: { focused: boolean; color: string; size: number }) => ReactNode
    >;
    TAB_DEFS.forEach((tab) => {
      icons[tab.name] = ({ focused, color }) => (
        <TabIcon Icon={tab.icon} focused={focused} color={color} activeColor={theme.primary[500]} />
      );
    });
    return icons;
  }, [theme.primary[500]]);

  const orderedTabs = useMemo(
    () => [...TAB_DEFS].sort((a, b) => tabOrder.indexOf(a.name) - tabOrder.indexOf(b.name)),
    [tabOrder],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: theme.tab.active,
      tabBarInactiveTintColor: theme.tab.inactive,
      tabBarAllowFontScaling: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: theme.tab.background,
        borderTopColor: theme.border,
        borderTopWidth: 1,
        height:
          (Platform.OS === 'ios' ? 64 : 56) +
          (responsive.isWide ? 8 : 0) +
          Math.max(insets.bottom, 0),
        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4),
        paddingTop: 4,
        paddingHorizontal: spacing.xs,
      },
      tabBarIconStyle: {
        marginBottom: 0,
      },
    }),
    [theme, insets.bottom, responsive.isWide],
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Tabs screenOptions={screenOptions}>
        {orderedTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t(tab.label),
              tabBarIcon: tabIcons[tab.name],
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
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapWide: {
    width: 60,
    height: 36,
    borderRadius: 18,
  },
});
