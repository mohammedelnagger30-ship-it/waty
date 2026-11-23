import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { ArrowLeft, Search, CheckSquare, Target, ListChecks, Flame, NotebookPen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BackArrow } from '@/src/components/BackArrow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Card, Chip, EmptyState, Input } from '@/src/components';
import {
  taskRepository,
  goalRepository,
  planRepository,
  habitRepository,
  reviewRepository,
} from '@/src/storage';
import type { Task, Goal, Plan, Habit, DailyReview } from '@/src/storage/entities';

type GroupKey = 'tasks' | 'goals' | 'plans' | 'habits' | 'reviews';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  group: GroupKey;
  route: string;
}

function matches(query: string, ...fields: Array<string | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return fields.some((field) => !!field && field.toLowerCase().includes(q));
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | GroupKey>('all');
  const [data, setData] = useState<{
    tasks: Task[];
    goals: Goal[];
    plans: Plan[];
    habits: Habit[];
    reviews: DailyReview[];
  }>({ tasks: [], goals: [], plans: [], habits: [], reviews: [] });

  const loadData = useCallback(async () => {
    const [tasks, goals, plans, habits, reviews] = await Promise.all([
      taskRepository.getAll(),
      goalRepository.getAll(),
      planRepository.getAll(),
      habitRepository.getAll(),
      reviewRepository.getAll(),
    ]);
    setData({ tasks, goals, plans, habits, reviews });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const found: SearchResult[] = [];

    for (const task of data.tasks) {
      if (matches(query, task.title, task.description, task.notes, ...task.tags)) {
        found.push({
          id: task.id,
          title: task.title,
          subtitle: task.description || task.date,
          group: 'tasks',
          route: `/tasks/${task.id}`,
        });
      }
    }
    for (const goal of data.goals) {
      if (matches(query, goal.title, goal.description, goal.motivation)) {
        found.push({
          id: goal.id,
          title: goal.title,
          subtitle: goal.description,
          group: 'goals',
          route: '/plans',
        });
      }
    }
    for (const plan of data.plans) {
      if (matches(query, plan.title, plan.description)) {
        found.push({
          id: plan.id,
          title: plan.title,
          subtitle: plan.description || plan.startDate,
          group: 'plans',
          route: '/plans',
        });
      }
    }
    for (const habit of data.habits) {
      if (matches(query, habit.title, habit.description)) {
        found.push({
          id: habit.id,
          title: habit.title,
          subtitle: habit.description,
          group: 'habits',
          route: '/plans',
        });
      }
    }
    for (const review of data.reviews) {
      if (matches(query, review.whatWentWell, review.whatToImprove, review.note)) {
        found.push({
          id: review.id,
          title: review.date,
          subtitle: review.whatWentWell || review.note,
          group: 'reviews',
          route: '/review',
        });
      }
    }
    return found;
  }, [query, data]);

  const visible = useMemo(
    () => (filter === 'all' ? results : results.filter((r) => r.group === filter)),
    [results, filter],
  );

  const grouped = useMemo(() => {
    const map: Partial<Record<GroupKey, SearchResult[]>> = {};
    for (const item of visible) {
      if (!map[item.group]) map[item.group] = [];
      map[item.group]!.push(item);
    }
    return map;
  }, [visible]);

  const groupIcon = (group: GroupKey, color: string) => {
    const size = 18;
    if (group === 'tasks') return <CheckSquare size={size} color={color} />;
    if (group === 'goals') return <Target size={size} color={color} />;
    if (group === 'plans') return <ListChecks size={size} color={color} />;
    if (group === 'habits') return <Flame size={size} color={color} />;
    return <NotebookPen size={size} color={color} />;
  };

  const groupKeys = (Object.keys(grouped) as GroupKey[]).filter((key) => (grouped[key]?.length ?? 0) > 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <BackArrow size={24} color={theme.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {t('search.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          leftIcon={<Search size={18} color={theme.text.tertiary} />}
        />

        <View style={styles.filterRow}>
          {(['all', 'tasks', 'goals', 'plans', 'habits', 'reviews'] as const).map((key) => (
            <Chip
              key={key}
              selected={filter === key}
              onPress={() => setFilter(key)}
            >
              {key === 'all' ? t('common.all') : t(`search.${key}` as TranslationKey)}
            </Chip>
          ))}
        </View>

        {!query.trim() ? (
          <EmptyState icon={<Search size={36} color={theme.text.tertiary} />} title={t('search.subtitle')} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Search size={36} color={theme.text.tertiary} />} title={t('search.noResults')} />
        ) : (
          groupKeys.map((group) => (
            <View key={group} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                {groupIcon(group, theme.primary[500])}
                <Text style={[styles.groupTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                  {t(`search.${group}` as TranslationKey)}
                </Text>
                <Text style={[styles.groupCount, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {grouped[group]!.length}
                </Text>
              </View>
              <Card style={styles.resultsCard} padded={false}>
                {grouped[group]!.map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(item.route as never)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      {
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.border,
                        backgroundColor: pressed ? theme.surfaceSecondary : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.resultText}>
                      <Text numberOfLines={1} style={[styles.resultTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text numberOfLines={1} style={[styles.resultSubtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    height: 56,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: typography.sizes.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  groupSection: { marginBottom: spacing.lg },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  groupTitle: { fontSize: typography.sizes.md },
  groupCount: { fontSize: typography.sizes.sm },
  resultsCard: { overflow: 'hidden' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  resultText: { flex: 1, gap: 2 },
  resultTitle: { fontSize: typography.sizes.sm },
  resultSubtitle: { fontSize: typography.sizes.xs },
});
