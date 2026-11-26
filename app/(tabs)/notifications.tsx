import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import {
  Bell,
  Sunrise,
  Moon,
  AlertTriangle,
  Volume2,
  Vibrate,
  Clock,
  MoonStar,
  CheckCircle2,
  Send,
  BellRing,
  Database,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, bottomSpace } from '@/src/theme';
import { Card, Toggle, Chip, Button, TimePickerField, LoadingState, ScreenHeader } from '@/src/components';
import { notificationSettingsRepository } from '@/src/storage';
import { NotificationSettings, ReminderOffset, AlarmSoundId } from '@/src/storage/entities';
import {
  requestNotificationPermissions,
  rescheduleAllNotifications,
  previewAlarm,
  ALARM_PRESETS,
  NOTIF_CHANNELS,
} from '@/src/notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const REMINDER_OPTIONS: ReminderOffset[] = ['at_time', '5', '10', '15', '30', '60'];

const reminderLabelKeys: Record<ReminderOffset, string> = {
  at_time: 'notifications.reminderAtTime',
  '5': 'notifications.reminder5',
  '10': 'notifications.reminder10',
  '15': 'notifications.reminder15',
  '30': 'notifications.reminder30',
  '60': 'notifications.reminder60',
  custom: 'notifications.reminderCustom',
};

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    const s = await notificationSettingsRepository.getOrCreate();
    setSettings(s);
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await notificationSettingsRepository.save(updated);
  };

  const handleToggleEnabled = async (value: boolean) => {
    if (value && !hasPermission) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          t('notifications.permissionDenied'),
          t('notifications.permissionDeniedDesc'),
        );
        return;
      }
      setHasPermission(true);
    }
    await updateSettings({ enabled: value });
    await rescheduleAllNotifications();
  };

  const handleToggleReminder = async (offset: ReminderOffset) => {
    if (!settings) return;
    const current = settings.defaultReminders;
    const has = current.includes(offset);
    const next = has
      ? current.filter((r) => r !== offset)
      : [...current, offset];
    await updateSettings({ defaultReminders: next });
    await rescheduleAllNotifications();
  };

  const handleTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'ar' ? 'إشعار تجريبي 🔔' : 'Test notification 🔔',
        body: language === 'ar'
          ? 'هذا إشعار تجريبي للتأكد من عمل الإشعارات'
          : 'This is a test notification from Orbit',
        sound: settings?.soundEnabled ? 'default' : undefined,
        ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.default } : {}),
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 2000) },
    });
    Alert.alert(t('notifications.testSent'));
  };

  if (loading || !settings) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState label={t('common.loading')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('notifications.title')} onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission denied banner */}
        {!hasPermission && (
          <Card style={{ marginBottom: spacing.md, borderWidth: 1.5, borderColor: theme.warning }}>
            <View style={styles.bannerRow}>
              <AlertTriangle size={20} color={theme.warning} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('notifications.permissionDenied')}
                </Text>
                <Text style={[styles.bannerDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('notifications.permissionDeniedDesc')}
                </Text>
              </View>
            </View>
            <Button
              variant="primary"
              onPress={async () => {
                const granted = await requestNotificationPermissions();
                if (granted) {
                  setHasPermission(true);
                  await updateSettings({ enabled: true });
                  await rescheduleAllNotifications();
                }
              }}
              style={{ marginTop: spacing.sm }}
            >
              {t('notifications.grantPermission')}
            </Button>
          </Card>
        )}

        {/* General toggle */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={theme.primary[500]} />
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.enableNotifs')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.enableNotifsDesc')}
              </Text>
            </View>
            <Toggle value={settings.enabled} onValueChange={handleToggleEnabled} />
          </View>
        </Card>

        {/* Task reminders */}
        <Text style={[styles.groupLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {t('notifications.taskReminders')}
        </Text>
        <Card style={styles.section}>
          <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily, marginBottom: spacing.md }]}>
            {t('notifications.taskRemindersDesc')}
          </Text>
          <Text style={[styles.subLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginBottom: spacing.sm }]}>
            {t('notifications.defaultReminders')}
          </Text>
          <View style={styles.chipRow}>
            {REMINDER_OPTIONS.map((offset) => (
              <Chip
                key={offset}
                selected={settings.defaultReminders.includes(offset)}
                onPress={() => handleToggleReminder(offset)}
              >
                {t(reminderLabelKeys[offset] as any)}
              </Chip>
            ))}
          </View>
        </Card>

        {/* Schedule section */}
        <Text style={[styles.groupLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {t('notifications.sectionSchedule')}
        </Text>

        {/* Morning summary */}
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <Sunrise size={20} color={theme.accent[500]} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.morningSummary')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.morningSummaryDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.morningSummaryEnabled}
              onValueChange={async (v) => {
                await updateSettings({ morningSummaryEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {settings.morningSummaryEnabled && (
            <TimeInputRow
              label={t('notifications.morningTime')}
              value={settings.morningSummaryTime}
              onChange={async (v) => {
                await updateSettings({ morningSummaryTime: v });
                await rescheduleAllNotifications();
              }}
            />
          )}
        </Card>

        {/* Evening review */}
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <MoonStar size={20} color={theme.secondary[500]} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.eveningReview')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.eveningReviewDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.eveningReviewEnabled}
              onValueChange={async (v) => {
                await updateSettings({ eveningReviewEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {settings.eveningReviewEnabled && (
            <TimeInputRow
              label={t('notifications.eveningTime')}
              value={settings.eveningReviewTime}
              onChange={async (v) => {
                await updateSettings({ eveningReviewTime: v });
                await rescheduleAllNotifications();
              }}
            />
          )}
        </Card>

        {/* Overdue reminder */}
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <AlertTriangle size={20} color={theme.error} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.overdueReminder')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.overdueReminderDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.overdueReminderEnabled}
              onValueChange={async (v) => {
                await updateSettings({ overdueReminderEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {settings.overdueReminderEnabled && (
            <TimeInputRow
              label={t('notifications.overdueTime')}
              value={settings.overdueReminderTime}
              onChange={async (v) => {
                await updateSettings({ overdueReminderTime: v });
                await rescheduleAllNotifications();
              }}
            />
          )}
        </Card>

        {/* Habit reminders */}
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <CheckCircle2 size={20} color={theme.warning} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.habitReminders')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.habitRemindersDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.dailyHabitReminderEnabled}
              onValueChange={async (v) => {
                await updateSettings({ dailyHabitReminderEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {settings.dailyHabitReminderEnabled && (
            <TimeInputRow
              label={t('notifications.habitTime')}
              value={settings.habitReminderTime}
              onChange={async (v) => {
                await updateSettings({ habitReminderTime: v });
                await rescheduleAllNotifications();
              }}
            />
          )}
        </Card>

        {/* Smart nudge for tasks without a fixed time */}
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <Clock size={20} color={theme.primary[500]} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.smartNudge')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.smartNudgeDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.untimedTaskReminderEnabled ?? true}
              onValueChange={async (v) => {
                await updateSettings({ untimedTaskReminderEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {(settings.untimedTaskReminderEnabled ?? true) && (
            <TimeInputRow
              label={t('notifications.smartNudgeTime')}
              value={settings.untimedTaskReminderTime ?? '16:00'}
              onChange={async (v) => {
                await updateSettings({ untimedTaskReminderTime: v });
                await rescheduleAllNotifications();
              }}
            />
          )}
        </Card>

        {/* Weekly backup reminder */}
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <Database size={20} color={theme.success} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.weeklyBackup')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.weeklyBackupDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.weeklyBackupReminderEnabled ?? false}
              onValueChange={async (v) => {
                await updateSettings({ weeklyBackupReminderEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {settings.weeklyBackupReminderEnabled ? (
            <TimeInputRow
              label={t('notifications.weeklyBackupTime')}
              value={settings.weeklyBackupTime ?? '20:00'}
              onChange={async (v) => {
                await updateSettings({ weeklyBackupTime: v });
                await rescheduleAllNotifications();
              }}
            />
          ) : null}
        </Card>

        {/* Quiet hours */}
        <Text style={[styles.groupLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {t('notifications.sectionQuiet')}
        </Text>
        <Card style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowIcon}>
              <Moon size={20} color={theme.primary[400]} />
            </View>
            <View style={styles.toggleRowText}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('notifications.quietHours')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('notifications.quietHoursDesc')}
              </Text>
            </View>
            <Toggle
              value={settings.quietHoursEnabled}
              onValueChange={async (v) => {
                await updateSettings({ quietHoursEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          {settings.quietHoursEnabled && (
            <View style={styles.timePairRow}>
              <TimeInputRow
                label={t('notifications.quietStart')}
                value={settings.quietHoursStart}
                onChange={async (v) => {
                  await updateSettings({ quietHoursStart: v });
                  await rescheduleAllNotifications();
                }}
                />
              <View style={{ width: spacing.md }} />
              <TimeInputRow
                label={t('notifications.quietEnd')}
                value={settings.quietHoursEnd}
                onChange={async (v) => {
                  await updateSettings({ quietHoursEnd: v });
                  await rescheduleAllNotifications();
                }}
                />
            </View>
          )}
        </Card>

        {/* Sound & Vibration */}
        <Text style={[styles.groupLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {t('notifications.sectionSound')}
        </Text>
        <Card style={styles.section}>
          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Volume2 size={20} color={theme.text.secondary} />
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('notifications.sound')}
                </Text>
                <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('notifications.soundDesc')}
                </Text>
              </View>
            </View>
            <Toggle
              value={settings.soundEnabled}
              onValueChange={async (v) => {
                await updateSettings({ soundEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Vibrate size={20} color={theme.text.secondary} />
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('notifications.vibration')}
                </Text>
                <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('notifications.vibrationDesc')}
                </Text>
              </View>
            </View>
            <Toggle
              value={settings.vibrationEnabled}
              onValueChange={async (v) => {
                await updateSettings({ vibrationEnabled: v });
                await rescheduleAllNotifications();
              }}
            />
          </View>
        </Card>

        {/* Loud alarm tones used at the exact task time */}
        <Text style={[styles.groupLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {t('alarm.title')}
        </Text>
        <Card style={styles.section}>
          <View style={styles.simpleRowLeft}>
            <BellRing size={20} color={theme.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('alarm.tone')}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('alarm.subtitle')}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.alarmChips}>
            {ALARM_PRESETS.map((preset) => (
              <Chip
                key={preset.id}
                selected={(settings.alarmSound ?? ALARM_PRESETS[0].id) === preset.id}
                onPress={async () => {
                  await updateSettings({ alarmSound: preset.id as AlarmSoundId });
                  await rescheduleAllNotifications();
                }}
              >
                {t(preset.labelKey as Parameters<typeof t>[0])}
              </Chip>
            ))}
          </View>
          <Pressable
            onPress={() => { void previewAlarm(settings.alarmSound); }}
            style={({ pressed }) => [
              styles.alarmPreview,
              { backgroundColor: theme.primary[500] + '1F', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Volume2 size={17} color={theme.primary[500]} />
            <Text style={{ color: theme.primary[500], fontFamily: typography.fontFamilySemiBold, fontSize: typography.sizes.sm }}>
              {t('alarm.test')}
            </Text>
          </Pressable>
        </Card>

        {/* Test notification */}
        <Pressable
          onPress={handleTestNotification}
          style={({ pressed }) => [
            styles.testBtn,
            {
              backgroundColor: theme.primary[500],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Send size={18} color="#FFFFFF" />
          <Text style={[styles.testBtnText, { fontFamily: typography.fontFamilySemiBold }]}>
            {t('notifications.testNotification')}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function TimeInputRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // The picker commits only on confirm, so rescheduling happens once instead
  // of on every keystroke.
  return (
    <View style={styles.timeInputRow}>
      <TimePickerField label={label} value={value} onChange={onChange} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: bottomSpace.normal,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: typography.sizes.sm,
  },
  bannerDesc: {
    fontSize: typography.sizes.xs,
  },
  groupLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginStart: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  alarmChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  alarmPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
  },
  sectionDesc: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * 1.5,
  },
  subLabel: {
    fontSize: typography.sizes.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleRowIcon: {
    width: 28,
    alignItems: 'center',
  },
  toggleRowText: {
    flex: 1,
    gap: 2,
  },
  timeInputRow: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  timeInputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeInputLabel: {
    fontSize: typography.sizes.xs,
  },
  timeInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    minHeight: 44,
  },
  timePairRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simpleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
  },
});
