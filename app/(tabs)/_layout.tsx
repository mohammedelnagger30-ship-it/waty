import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, CheckSquare, Target, BarChart3, Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { typography, spacing } from '@/src/theme';

export default function TabLayout() {
  const { theme } = useTheme();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();

  // Focused tabs get a pill and a dot in addition to the tinted label/icon.
  const tabIcon = (Icon: typeof Calendar) =>
    ({ focused, color }: { focused: boolean; color: string; size: number }) => (
      <View style={[styles.iconWrap, focused && { backgroundColor: theme.primary[500] + '1C' }]}>
        <Icon color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
        {focused && <View style={[styles.activeDot, { backgroundColor: theme.tab.active }]} />}
      </View>
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tab.active,
        tabBarInactiveTintColor: theme.tab.inactive,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: theme.tab.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: (Platform.OS === 'ios' ? 88 : 66) + Math.max(insets.bottom, 4),
          paddingBottom: (Platform.OS === 'ios' ? 12 : 6) + Math.max(insets.bottom, 4),
          paddingTop: 6,
          paddingHorizontal: spacing.xs,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamilySemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.today'),
          tabBarIcon: tabIcon(Calendar),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('tab.tasks'),
          tabBarIcon: tabIcon(CheckSquare),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t('tab.plans'),
          tabBarIcon: tabIcon(Target),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tab.stats'),
          tabBarIcon: tabIcon(BarChart3),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab.settings'),
          tabBarIcon: tabIcon(SettingsIcon),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </SafeAreaView>
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
  activeDot: {
    position: 'absolute',
    bottom: -1,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
