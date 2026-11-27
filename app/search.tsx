import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, FlatList, Pressable } from 'react-native';
import { Search, CheckSquare, Target, ListChecks, Flame, NotebookPen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from '@/src/context';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { spacing, typography, radius, iconSize } from '@/src/theme';
import { Chip, EmptyState, Input, ScreenHeader } from '@/src/components';
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

type SearchListItem =
  | { kind: 'group'; key: string; group: GroupKey; count: number }
  | { kind: 'result'; key: string; result: SearchResult; first: boolean };

function matches(normalized: string, ...fields: Array<string | undefined>): boolean {
  if (!normalized) return false;
  return fields.some((field) => !!field && field.toLowerCase().includes(normalized));
}

export default function SearchScreen() {
  const keyboardInset = useKeyboardInset();
  const { dataVersion } = useAuth();
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
  }, [loadData, dataVersion]);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const results = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];
    const found: SearchResult[] = [];

    for (const task of data.tasks) {
      if (matches(normalizedQuery, task.title, task.description, task.notes, ...task.tags)) {
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
      if (matches(normalizedQuery,goal.title, goal.description, goal.motivation)) {
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
      if (matches(normalizedQuery,plan.title, plan.description)) {
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
      if (matches(normalizedQuery,habit.title, habit.description)) {
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
      if (matches(normalizedQuery,review.whatWentWell, review.whatToImprove, review.note)) {
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
  }, [normalizedQuery, data]);

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

  const listItems = useMemo<SearchListItem[]>(() => {
    const keys = (Object.keys(grouped) as GroupKey[]).filter(
      (key) => (grouped[key]?.length ?? 0) > 0,
    );
    return keys.flatMap((group) => {
      const items = grouped[group] ?? [];
      return [
        { kind: 'group' as const, key: `group:${group}`, group, count: items.length },
        ...items.map((result, index) => ({
          kind: 'result' as const,
          key: `${group}:${result.id}`,
          result,
          first: index === 0,
        })),
      ];
    });
  }, [grouped]);

  const renderListItem = useCallback(
    ({ item }: { item: SearchListItem }) => {
      if (item.kind === 'group') {
        return (
          <View style={styles.groupHeader}>
            {groupIcon(item.group, theme.primary[500])}
            <Text style={[styles.groupTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t(`search.${item.group}` as TranslationKey)}
            </Text>
            <Text style={[styles.groupCount, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {item.count}
            </Text>
          </View>
        );
      }
      return (
        <Pressable
          onPress={() => router.push(item.result.route as never)}
          style={({ pressed }) => [
            styles.resultRow,
            {
              borderTopWidth: item.first ? 0 : 1,
              borderTopColor: theme.border,
              backgroundColor: pressed ? theme.surfaceSecondary : 'transparent',
            },
          ]}
        >
          <View style={styles.resultText}>
            <Text numberOfLines={2} style={[styles.resultTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {item.result.title}
            </Text>
            {item.result.subtitle ? (
              <Text numberOfLines={1} style={[styles.resultSubtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {item.result.subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [theme, t, router],
  );

  const listItemKey = useCallback((item: SearchListItem) => item.key, []);

  const listHeader = useMemo(
    () => (
      <>
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
      </>
    ),
    [query, filter, t, theme],
  );

  const emptyState = useMemo(
    () => !normalizedQuery ? (
      <EmptyState icon={<Search size={iconSize.hero} color={theme.text.tertiary} />} title={t('search.subtitle')} />
    ) : (
      <EmptyState icon={<Search size={iconSize.hero} color={theme.text.tertiary} />} title={t('search.noResults')} />
    ),
    [normalizedQuery, t, theme],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('search.title')} onBack={() => router.back()} />

      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + keyboardInset }]}
        keyboardShouldPersistTaps="handled"
        data={listItems}
        renderItem={renderListItem}
        keyExtractor={listItemKey}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
      />
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
  resultTitle: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.65 },
  resultSubtitle: { fontSize: typography.sizes.xs, lineHeight: typography.sizes.xs * 1.65 },
});
