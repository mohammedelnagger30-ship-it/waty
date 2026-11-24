import { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { ArrowLeft, Database, Download, Upload, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BackArrow } from '@/src/components/BackArrow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Button, Card } from '@/src/components';
import {
  taskRepository,
  goalRepository,
  planRepository,
  habitRepository,
  reviewRepository,
  pomodoroRepository,
  weeklyReviewRepository,
  reminderRepository,
  settingsRepository,
  notificationSettingsRepository,
  taskTemplateRepository,
} from '@/src/storage';
import { todayISODate } from '@/src/storage/repository';
import { cancelAllReminders, rescheduleAllNotifications } from '@/src/notifications';

const BACKUP_KEYS = [
  'tasks',
  'goals',
  'plans',
  'habits',
  'reviews',
  'pomodoros',
  'weeklyReviews',
  'reminders',
  'settings',
  'notif_settings',
  'task_templates',
] as const;

type BackupKey = (typeof BACKUP_KEYS)[number];

// Old backups (version 1) did not include settings; those keys stay optional
// on import so an old backup never fails or wipes current preferences.
const OPTIONAL_KEYS: BackupKey[] = ['settings', 'notif_settings', 'task_templates'];

const repositories: Record<BackupKey, { getAll: () => Promise<unknown[]>; replaceAll: (items: never[]) => Promise<void> }> = {
  tasks: taskRepository as never,
  goals: goalRepository as never,
  plans: planRepository as never,
  habits: habitRepository as never,
  reviews: reviewRepository as never,
  pomodoros: pomodoroRepository as never,
  weeklyReviews: weeklyReviewRepository as never,
  reminders: reminderRepository as never,
  settings: settingsRepository as never,
  notif_settings: notificationSettingsRepository as never,
  task_templates: taskTemplateRepository as never,
};

export default function DataScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = useCallback(async () => {
    try {
      setBusy(true);
      const collections = await Promise.all(
        BACKUP_KEYS.map(async (key) => [key, await repositories[key].getAll()] as const),
      );
      const payload = {
        app: 'waqty',
        version: 3,
        exportedAt: new Date().toISOString(),
        data: Object.fromEntries(collections),
      };
      const json = JSON.stringify(payload, null, 2);
      setExportText(json);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `waqty-backup-${todayISODate()}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(json)
            .then(() => setStatus(t('data.copied')))
            .catch(() => {});
        }
      }
      setStatus(t('data.success'));
    } catch {
      Alert.alert(t('data.title'), t('data.error'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) return;
    try {
      setBusy(true);
      const parsed = JSON.parse(importText);
      const source = parsed?.data ?? parsed;
      if (!source || typeof source !== 'object') throw new Error('invalid');

      const collections: Array<readonly [BackupKey, unknown[]]> = [];
      for (const key of BACKUP_KEYS) {
        const value = source[key];
        if (value === undefined && OPTIONAL_KEYS.includes(key)) continue;
        if (!Array.isArray(value)) throw new Error(`invalid:${key}`);
        collections.push([key, value]);
      }

      // Writes are sequential because repositories use read-modify-write.
      for (const [key, value] of collections) {
        await repositories[key].replaceAll(value as never[]);
      }
      // Rebuild reminders from the imported tasks/settings instead of leaving
      // the app with no notifications until the next edit.
      await cancelAllReminders().catch(() => {});
      await rescheduleAllNotifications().catch(() => {});
      setStatus(t('data.success'));
      Alert.alert(t('data.title'), t('data.success'));
    } catch {
      Alert.alert(t('data.title'), t('data.error'));
    } finally {
      setBusy(false);
    }
  }, [importText, t]);

  const handleClear = useCallback(() => {
    Alert.alert(t('data.clear'), t('data.clearDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            for (const key of BACKUP_KEYS) {
              // Keep language/theme/notification preferences so the app stays
              // usable and the cached settings object matches storage.
              if (OPTIONAL_KEYS.includes(key)) continue;
              await repositories[key].replaceAll([]);
            }
            await cancelAllReminders().catch(() => {});
            setExportText('');
            setImportText('');
            setStatus(t('data.success'));
          } catch {
            Alert.alert(t('data.title'), t('data.error'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <BackArrow size={24} color={theme.text.primary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('data.title')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('data.subtitle')}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Download size={20} color={theme.primary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('data.export')}
            </Text>
          </View>
          <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('data.exportDesc')}
          </Text>
          <Button onPress={handleExport} loading={busy} icon={<Download size={18} color="#FFFFFF" />}>
            {t('data.download')}
          </Button>
          {exportText ? (
            <TextInput
              value={exportText}
              multiline
              editable={false}
              style={[styles.jsonBox, { color: theme.text.secondary, backgroundColor: theme.surfaceSecondary, borderColor: theme.border, fontFamily: 'monospace' }]}
            />
          ) : null}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Upload size={20} color={theme.secondary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('data.import')}
            </Text>
          </View>
          <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('data.importDesc')}
          </Text>
          <TextInput
            value={importText}
            onChangeText={setImportText}
            multiline
            numberOfLines={6}
            placeholder={t('data.importHint')}
            placeholderTextColor={theme.text.tertiary}
            style={[styles.jsonBox, { color: theme.text.primary, backgroundColor: theme.surfaceSecondary, borderColor: theme.border, fontFamily: 'monospace' }]}
          />
          <Button onPress={handleImport} loading={busy} disabled={!importText.trim()} icon={<Upload size={18} color="#FFFFFF" />}>
            {t('data.apply')}
          </Button>
        </Card>

        {status ? (
          <View style={[styles.statusBox, { backgroundColor: theme.success + '18' }]}>
            <Text style={[styles.statusText, { color: theme.success, fontFamily: typography.fontFamilySemiBold }]}>
              {status}
            </Text>
          </View>
        ) : null}

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={theme.error} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('data.clear')}
            </Text>
          </View>
          <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('data.clearDesc')}
          </Text>
          <Button variant="danger" onPress={handleClear} loading={busy} icon={<Trash2 size={18} color="#FFFFFF" />}>
            {t('data.clear')}
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  headerTitle: { fontSize: typography.sizes.lg },
  headerSubtitle: { fontSize: typography.sizes.xs },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.md },
  desc: { fontSize: typography.sizes.sm },
  jsonBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 90,
    maxHeight: 180,
    fontSize: typography.sizes.xs,
    textAlignVertical: 'top',
  },
  statusBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  statusText: { fontSize: typography.sizes.sm },
});
