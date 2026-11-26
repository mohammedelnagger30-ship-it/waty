import { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, TextInput } from 'react-native';
import { Database, Download, Upload, Trash2, Activity, Wrench } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/src/context';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize } from '@/src/theme';
import { Button, Card, ScreenHeader, SectionHeader } from '@/src/components';
import {
  taskRepository,
  goalRepository,
  planRepository,
  recurringPlanRepository,
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
import {
  checkDataHealth,
  repairTaskLinks,
  type HealthCollections,
  type HealthReport,
} from '@/src/utils/dataHealth';

const BACKUP_KEYS = [
  'tasks',
  'goals',
  'plans',
  'recurring_plans',
  'habits',
  'reviews',
  'pomodoros',
  'weekly_reviews',
  'reminders',
  'settings',
  'notif_settings',
  'task_templates',
] as const;

type BackupKey = (typeof BACKUP_KEYS)[number];

// Old backups (version 1) did not include settings; those keys stay optional
// on import so an old backup never fails or wipes current preferences.
const OPTIONAL_KEYS: BackupKey[] = ['settings', 'notif_settings', 'task_templates', 'recurring_plans'];

// Clearing data keeps only the preferences that keep the app usable.
const PRESERVE_KEYS: BackupKey[] = ['settings', 'notif_settings'];

const repositories: Record<BackupKey, { getAll: () => Promise<unknown[]>; replaceAll: (items: never[]) => Promise<void> }> = {
  tasks: taskRepository as never,
  goals: goalRepository as never,
  plans: planRepository as never,
  recurring_plans: recurringPlanRepository as never,
  habits: habitRepository as never,
  reviews: reviewRepository as never,
  pomodoros: pomodoroRepository as never,
  weekly_reviews: weeklyReviewRepository as never,
  reminders: reminderRepository as never,
  settings: settingsRepository as never,
  notif_settings: notificationSettingsRepository as never,
  task_templates: taskTemplateRepository as never,
};

export default function DataScreen() {
  const keyboardInset = useKeyboardInset();
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);

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
      let source = parsed?.data ?? parsed;
      if (!source || typeof source !== 'object') throw new Error('invalid');
      // v1-v3 backups used the wrong key for weekly reviews; accept both.
      if (source.weekly_reviews === undefined && Array.isArray(source.weeklyReviews)) {
        source = { ...source, weekly_reviews: source.weeklyReviews };
      }

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
      // Imported settings must not stay cached from before the restore.
      settingsRepository.invalidate();
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
              if (PRESERVE_KEYS.includes(key)) continue;
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

  const runHealthCheck = useCallback(async () => {
    try {
      setChecking(true);
      const collections = await Promise.all(
        BACKUP_KEYS.map(async (key) => [key, await repositories[key].getAll()] as const),
      );
      const data = Object.fromEntries(collections) as unknown as HealthCollections;
      setReport(checkDataHealth(data));
    } catch {
      Alert.alert(t('data.title'), t('data.error'));
    } finally {
      setChecking(false);
    }
  }, [t]);

  const handleRepair = useCallback(async () => {
    try {
      setRepairing(true);
      const current = await taskRepository.getAll();
      const { changed } = repairTaskLinks(current);
      for (const task of changed) {
        await taskRepository.update(task.id, { dependsOn: task.dependsOn });
      }
      const taskIds = new Set(current.map((task) => task.id));
      const storedReminders = await reminderRepository.getAll();
      for (const reminder of storedReminders) {
        if (!taskIds.has(reminder.taskId)) await reminderRepository.delete(reminder.id);
      }
      await cancelAllReminders().catch(() => {});
      await rescheduleAllNotifications().catch(() => {});
      setStatus(t('data.healthRepaired'));
      await runHealthCheck();
    } catch {
      Alert.alert(t('data.title'), t('data.error'));
    } finally {
      setRepairing(false);
    }
  }, [t, runHealthCheck]);

  const canRepair = !!report?.issues.some((issue) =>
    ['brokenDeps', 'cycles', 'orphanReminders'].includes(issue.id),
  );
  const scoreColor = !report
    ? theme.success
    : report.score >= 80
      ? theme.success
      : report.score >= 50
        ? theme.warning
        : theme.error;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('data.title')}
        subtitle={t('data.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + keyboardInset }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.section}>
          <SectionHeader
            icon={<Download size={iconSize.lg} color={theme.primary[500]} />}
            title={t('data.export')}
            color={theme.primary[500]}
          />
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
          <SectionHeader
            icon={<Upload size={iconSize.lg} color={theme.secondary[500]} />}
            title={t('data.import')}
            color={theme.secondary[500]}
          />
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

        <Card style={styles.section}>
          <SectionHeader
            icon={<Activity size={iconSize.lg} color={theme.accent[500]} />}
            title={t('data.health')}
            color={theme.accent[500]}
          />
          <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('data.healthDesc')}
          </Text>
          <Button
            variant="outline"
            onPress={() => void runHealthCheck()}
            loading={checking}
            icon={<Activity size={18} color={theme.primary[600]} />}
          >
            {t('data.healthRun')}
          </Button>
          {report ? (
            <View style={styles.healthResult}>
              <View style={styles.healthScoreRow}>
                <Text style={[styles.healthScoreText, { color: scoreColor, fontFamily: typography.fontFamilySemiBold }]}>
                  {`${t('data.healthScore')}: ${report.score}/100`}
                </Text>
                <Text style={[styles.healthTotal, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {`${report.totalRecords} ${t('data.healthRecords')}`}
                </Text>
              </View>
              <View style={[styles.scoreTrack, { backgroundColor: theme.surfaceTertiary }]}>
                <View style={[styles.scoreFill, { width: `${report.score}%`, backgroundColor: scoreColor }]} />
              </View>
              {report.issues.length === 0 ? (
                <Text style={[styles.desc, { color: theme.success, fontFamily: typography.fontFamily }]}>
                  {t('data.healthClean')}
                </Text>
              ) : (
                report.issues.map((issue) => {
                  const dot = issue.severity === 'error'
                    ? theme.error
                    : issue.severity === 'warning'
                      ? theme.warning
                      : theme.text.tertiary;
                  return (
                    <View key={issue.id} style={styles.healthIssueRow}>
                      <View style={[styles.healthDot, { backgroundColor: dot }]} />
                      <Text style={[styles.healthIssueLabel, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                        {t(issue.labelKey)}
                      </Text>
                      <Text style={[styles.healthIssueCount, { color: dot, fontFamily: typography.fontFamilySemiBold }]}>
                        {issue.count}
                      </Text>
                    </View>
                  );
                })
              )}
              {canRepair ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => void handleRepair()}
                  loading={repairing}
                  icon={<Wrench size={16} color="#FFFFFF" />}
                >
                  {t('data.healthRepair')}
                </Button>
              ) : null}
            </View>
          ) : null}
        </Card>

        {status ? (
          <View style={[styles.statusBox, { backgroundColor: theme.success + '18' }]}>
            <Text style={[styles.statusText, { color: theme.success, fontFamily: typography.fontFamilySemiBold }]}>
              {status}
            </Text>
          </View>
        ) : null}

        <Card style={styles.section}>
          <SectionHeader
            icon={<Database size={iconSize.lg} color={theme.error} />}
            title={t('data.clear')}
            color={theme.error}
          />
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
  healthResult: { gap: spacing.sm },
  healthScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  healthScoreText: { fontSize: typography.sizes.sm },
  healthTotal: { fontSize: typography.sizes.xs },
  scoreTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  healthIssueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  healthDot: { width: 7, height: 7, borderRadius: 4 },
  healthIssueLabel: { flex: 1, fontSize: typography.sizes.sm },
  healthIssueCount: { fontSize: typography.sizes.xs },
  statusBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  statusText: { fontSize: typography.sizes.sm },
});
