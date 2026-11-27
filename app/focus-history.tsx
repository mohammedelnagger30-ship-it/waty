import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Coffee, History, Timer } from 'lucide-react-native';
import { useAuth, useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize } from '@/src/theme';
import { ScreenHeader, EmptyState, Chip, Card } from '@/src/components';
import { pomodoroRepository, taskRepository } from '@/src/storage';
import { PomodoroSession, Task } from '@/src/storage/entities';

type Filter = 'all' | 'focus' | 'break';

export default function FocusHistoryScreen() {
  const { dataVersion } = useAuth();
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [allSessions, allTasks] = await Promise.all([
      pomodoroRepository.getAll(),
      taskRepository.getAll(),
    ]);
    setSessions(allSessions);
    setTasks(allTasks);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load, dataVersion]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const taskTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks) map.set(task.id, task.title);
    return map;
  }, [tasks]);

  const visible = useMemo(() => {
    const list = filter === 'all' ? sessions : sessions.filter((s) => s.type === filter);
    return [...list].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  }, [sessions, filter]);

  const totals = useMemo(() => {
    let focus = 0;
    let breaks = 0;
    let focusCount = 0;
    for (const session of sessions) {
      if (session.type === 'focus') {
        focus += session.durationMinutes;
        focusCount += 1;
      } else {
        breaks += session.durationMinutes;
      }
    }
    return { focus, breaks, focusCount };
  }, [sessions]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PomodoroSession[]>();
    for (const session of visible) {
      const date = new Date(session.endedAt);
      const key = Number.isNaN(date.getTime())
        ? session.endedAt.slice(0, 10)
        : date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });
      const list = groups.get(key);
      if (list) list.push(session);
      else groups.set(key, [session]);
    }
    return Array.from(groups.entries());
  }, [visible, language]);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('focus.title')}
        subtitle={t('focus.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary[500]]} />
        }
      >
        <View style={styles.summaryRow}>
          <Card padded={false} style={styles.summaryCard}>
            <Timer size={iconSize.lg} color={theme.primary[500]} />
            <Text style={[styles.summaryValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {totals.focus}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('focus.total')}
            </Text>
          </Card>
          <Card padded={false} style={styles.summaryCard}>
            <History size={iconSize.lg} color={theme.accent[500]} />
            <Text style={[styles.summaryValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {totals.focusCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('focus.sessions')}
            </Text>
          </Card>
          <Card padded={false} style={styles.summaryCard}>
            <Coffee size={iconSize.lg} color={theme.secondary[500]} />
            <Text style={[styles.summaryValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {totals.breaks}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('focus.break')}
            </Text>
          </Card>
        </View>

        <View style={styles.filters}>
          {(['all', 'focus', 'break'] as Filter[]).map((item) => (
            <Chip key={item} selected={filter === item} onPress={() => setFilter(item)}>
              {item === 'all' ? t('common.all') : item === 'focus' ? t('focus.focus') : t('focus.break')}
            </Chip>
          ))}
        </View>

        {grouped.length === 0 ? (
          <EmptyState
            icon={<History size={iconSize.hero} color={theme.text.tertiary} />}
            title={t('focus.empty')}
            description={t('focus.emptyDesc')}
          />
        ) : (
          grouped.map(([day, daySessions]) => (
            <View key={day} style={styles.group}>
              <Text style={[styles.groupTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {day}
              </Text>
              <Card style={styles.groupCard}>
                {daySessions.map((session, i) => {
                  const isFocus = session.type === 'focus';
                  const color = isFocus ? theme.primary[500] : theme.secondary[500];
                  return (
                    <View key={session.id}>
                      {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                      <View style={styles.row}>
                        <View style={[styles.rowIcon, { backgroundColor: color + '1F' }]}>
                          {isFocus ? <Timer size={17} color={color} /> : <Coffee size={17} color={color} />}
                        </View>
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]} numberOfLines={3}>
                            {taskTitles.get(session.taskId) ?? (isFocus ? t('focus.focus') : t('focus.break'))}
                          </Text>
                          <Text style={[styles.rowMeta, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                            {formatTime(session.endedAt)}
                            {' · '}
                            {isFocus ? t('focus.focus') : t('focus.break')}
                          </Text>
                        </View>
                        <Text style={[styles.rowDuration, { color, fontFamily: typography.fontFamilyBold }]}>
                          {session.durationMinutes}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: { fontSize: typography.sizes.xl },
  summaryLabel: { fontSize: typography.sizes.xs, textAlign: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
  groupTitle: { fontSize: typography.sizes.md },
  groupCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: typography.sizes.md, lineHeight: typography.sizes.md * 1.65 },
  rowMeta: { fontSize: typography.sizes.xs },
  rowDuration: { fontSize: typography.sizes.lg },
});
