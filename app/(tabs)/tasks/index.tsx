import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Text, ScrollView, FlatList, RefreshControl, Alert, Pressable } from 'react-native';
import { CheckSquare, Calendar, ListChecks, X, Undo2, AlertTriangle, GitBranch, Zap, Check, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize, bottomSpace } from '@/src/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';
import { LoadingState } from '@/src/components/LoadingState';
import { FAB } from '@/src/components/FAB';
import { TaskCard } from '@/src/components/TaskCard';
import { PriorityMatrix } from '@/src/components/PriorityMatrix';
import { Chip } from '@/src/components/Chip';
import { FilterBar } from '@/src/components/FilterBar';
import { QuickAddModal } from '@/src/components/QuickAddModal';
import { TaskFormModal } from '@/src/components/TaskFormModal';
import { taskRepository } from '@/src/storage';
import { haptics } from '@/src/utils/haptics';
import { findHighImpactTasks, findQuickWins } from '@/src/utils/prioritySignals';
import { Task, TaskStatus, TaskPriority } from '@/src/storage/entities';
import { scheduleTaskReminders, cancelTaskReminders, rescheduleTaskReminders } from '@/src/notifications';
import {
  FilterOptions,
  SortOption,
  filterTasks,
  sortTasks,
  groupTasksByDate,
  addDays,
  completeRepeatingTask,
  createDefaultTask,
  getUnmetDependencies,
  buildPriorityMatrix,
  findScheduleConflicts,
  resolveScheduleConflicts,
  indexTasksById,
  type TaskGroup,
} from '@/src/utils/taskUtils';

const groupLabels: Record<string, 'tasks.group.overdue' | 'tasks.group.today' | 'tasks.group.tomorrow' | 'tasks.group.thisWeek' | 'tasks.group.later'> = {
  overdue: 'tasks.group.overdue',
  today: 'tasks.group.today',
  tomorrow: 'tasks.group.tomorrow',
  thisWeek: 'tasks.group.thisWeek',
  later: 'tasks.group.later',
};

const defaultFilters: FilterOptions = {
  search: '',
  category: 'all',
  priority: 'all',
  status: 'all',
};

type TaskListItem =
  | { kind: 'group'; key: string; group: TaskGroup }
  | { kind: 'task'; key: string; task: Task; conflictCount: number };

// Notification failures must never abort a create/delete or leave stale data.
async function notify(work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch {
    // best-effort only
  }
}

export default function TasksScreen() {
  const { dataVersion } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [sort, setSort] = useState<SortOption>('date');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialTask, setInitialTask] = useState<Task | null>(null);
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [undoTasks, setUndoTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    const all = await taskRepository.getAll();
    setTasks(all);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Tabs stay mounted, so reload whenever this screen becomes visible.
  // Otherwise a task created/deleted on another screen stays stale here.
  useFocusEffect(useCallback(() => { void loadTasks(); }, [loadTasks, dataVersion]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadTasks();
  }, [loadTasks]);

  const handleAddTask = useCallback(async (task: Task) => {
    const saved = await taskRepository.create(task);
    await notify(() => scheduleTaskReminders(task));
    await loadTasks();
    return saved?.id === task.id;
  }, [loadTasks]);

  const handleUpdateTask = useCallback(async (task: Task) => {
    const saved = await taskRepository.update(task.id, task);
    if (!saved) return false;
    await notify(() => rescheduleTaskReminders(task));
    await loadTasks();
    return true;
  }, [loadTasks]);

  const handleDeleteTask = useCallback(async (id: string) => {
    const removed = tasks.find((task) => task.id === id);
    await taskRepository.delete(id);
    await notify(() => cancelTaskReminders(id));
    setUndoTasks(removed ? [removed] : []);
    setSelectedIds((current) => current.filter((taskId) => taskId !== id));
    await loadTasks();
  }, [tasks, loadTasks]);

  const handleUndo = useCallback(async () => {
    if (!undoTasks.length) return;
    const restored = undoTasks;
    setUndoTasks([]);
    for (const task of restored) {
      await taskRepository.create(task);
      await notify(() => scheduleTaskReminders(task));
    }
    await loadTasks();
  }, [undoTasks, loadTasks]);

  const toggleSelect = useCallback((task: Task) => {
    haptics.selection();
    setSelectedIds((current) =>
      current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
    );
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const handleBulkComplete = useCallback(async () => {
    const selected = new Set(selectedIds);
    const byId = indexTasksById(tasks);
    const chosen = tasks.filter((task) => selected.has(task.id) && task.status !== 'done');
    const blocked = chosen.filter((task) => getUnmetDependencies(task, tasks, byId).length > 0);
    const ready = chosen.filter((task) => !getUnmetDependencies(task, tasks, byId).length);
    for (const task of ready) {
      const { nextOccurrence, completed } = completeRepeatingTask(task);
      await taskRepository.update(task.id, completed);
      await notify(() => cancelTaskReminders(task.id));
      if (nextOccurrence) {
        await taskRepository.create(nextOccurrence);
        await notify(() => scheduleTaskReminders(nextOccurrence));
      }
    }
    exitSelection();
    await loadTasks();
    if (blocked.length) {
      Alert.alert(t('tasks.blockedTitle'), `${t('tasks.blockedCount')}: ${blocked.length}`);
    }
  }, [tasks, selectedIds, exitSelection, loadTasks, t]);

  const handleBulkDelete = useCallback(async () => {
    const removed = tasks.filter((task) => selectedIds.includes(task.id));
    for (const task of removed) {
      await taskRepository.delete(task.id);
      await notify(() => cancelTaskReminders(task.id));
    }
    setUndoTasks(removed);
    exitSelection();
    await loadTasks();
  }, [tasks, selectedIds, exitSelection, loadTasks]);

  const handleComplete = useCallback(async (task: Task) => {
    const blockers = getUnmetDependencies(task, tasks);
    if (blockers.length) {
      Alert.alert(t('tasks.blockedTitle'), `${t('tasks.blockedMsg')} ${blockers.map((item) => item.title).join('، ')}`);
      return;
    }
    const { nextOccurrence, completed } = completeRepeatingTask(task);
    if (nextOccurrence) {
      await taskRepository.create(nextOccurrence);
      await notify(() => scheduleTaskReminders(nextOccurrence));
    }
    await taskRepository.update(task.id, completed);
    await notify(() => cancelTaskReminders(task.id));
    await loadTasks();
  }, [tasks, loadTasks, t]);

  const handleFixConflicts = useCallback(async () => {
    const fixes = resolveScheduleConflicts(tasks);
    if (!fixes.length) return;
    for (const fix of fixes) {
      const task = tasks.find((item) => item.id === fix.id);
      if (!task) continue;
      const updated = await taskRepository.update(fix.id, { time: fix.time });
      if (updated) await notify(() => rescheduleTaskReminders(updated));
    }
    await loadTasks();
    Alert.alert(t('tasks.conflictsFixed'), `${t('tasks.fixedCount')}: ${fixes.length}`);
  }, [tasks, loadTasks, t]);

  const handlePostpone = useCallback(async (task: Task) => {
    const next = addDays(task.date, 1);
    const updated = await taskRepository.update(task.id, {
      status: 'postponed' as TaskStatus,
      date: next,
      originalDate: task.date,
    });
    if (updated) await notify(() => rescheduleTaskReminders(updated));
    await loadTasks();
  }, [loadTasks]);

  const handleDeleteConfirm = useCallback((task: Task) => {
    Alert.alert(t('tasks.confirmDelete'), t('tasks.confirmDeleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => { void handleDeleteTask(task.id); },
      },
    ]);
  }, [t, handleDeleteTask]);

  const handleCardPress = useCallback((task: Task) => {
    router.push(`/tasks/${task.id}`);
  }, [router]);

  const handleEditPress = useCallback((task: Task) => {
    setInitialTask(null);
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleMoreDetails = useCallback((title: string, date: string, time: string, priority: TaskPriority) => {
    setShowQuickAdd(false);
    setEditingTask(null);
    setInitialTask(createDefaultTask({ title, date, time: time || undefined, priority }));
    setShowForm(true);
  }, []);

  const handleTagPress = useCallback((tag: string) => {
    setFilters((current) => ({ ...current, search: tag }));
  }, []);

  const filteredTasks = useMemo(() => {
    const filtered = filterTasks(tasks, filters);
    const sorted = sortTasks(filtered, sort);
    return sorted;
  }, [tasks, filters, sort]);

  const grouped = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks]);
  const matrixGroups = useMemo(() => buildPriorityMatrix(filteredTasks), [filteredTasks]);
  const scheduleConflicts = useMemo(() => findScheduleConflicts(filteredTasks), [filteredTasks]);
  const listItems = useMemo<TaskListItem[]>(
    () =>
      grouped.flatMap((group) => [
        { kind: 'group' as const, key: `group:${group.key}`, group },
        ...group.tasks.map((task) => ({
          kind: 'task' as const,
          key: task.id,
          task,
          conflictCount: scheduleConflicts[task.id]?.length ?? 0,
        })),
      ]),
    [grouped, scheduleConflicts],
  );
  const impactTasks = useMemo(() => findHighImpactTasks(tasks), [tasks]);
  const quickWins = useMemo(() => findQuickWins(tasks), [tasks]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasAnyTasks = tasks.length > 0;
  const hasFilteredResults = filteredTasks.length > 0;

  const listHeaderContent = useMemo(
    () => (
      <>
        {impactTasks.length > 0 ? (
          <View style={[styles.insightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.insightHeading}>
              <GitBranch size={17} color={theme.secondary[500]} />
              <View style={styles.insightHeadingText}>
                <Text style={[styles.insightTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('tasks.impact')}
                </Text>
                <Text style={[styles.insightHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('tasks.impactHint')}
                </Text>
              </View>
            </View>
            {impactTasks.map((item) => (
              <Pressable
                key={item.task.id}
                onPress={() => handleCardPress(item.task)}
                style={({ pressed }) => [styles.insightRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.impactBadge, { backgroundColor: theme.secondary[500] + '1F' }]}>
                  <Text style={[styles.impactBadgeText, { color: theme.secondary[500], fontFamily: typography.fontFamilyBold }]}>
                    {item.blockedCount}
                  </Text>
                </View>
                <Text numberOfLines={2} style={[styles.insightRowText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                  {item.task.title}
                </Text>
                <ChevronRight size={16} color={theme.text.tertiary} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {quickWins.length > 0 ? (
          <View style={[styles.insightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.insightHeading}>
              <Zap size={17} color={theme.warning} />
              <View style={styles.insightHeadingText}>
                <Text style={[styles.insightTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('tasks.quickWins')}
                </Text>
                <Text style={[styles.insightHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('tasks.quickWinsHint')}
                </Text>
              </View>
            </View>
            {quickWins.map(({ task, minutes }) => (
              <View key={task.id} style={styles.insightRow}>
                <Pressable
                  onPress={() => handleCardPress(task)}
                  style={({ pressed }) => [styles.insightRowMain, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text numberOfLines={2} style={[styles.insightRowText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.quickTime, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    {`${minutes}${t('tasks.minutes')}`}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleComplete(task)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('tasks.bulkComplete')}
                  style={[styles.quickCheck, { borderColor: theme.success }]}
                >
                  <Check size={14} color={theme.success} strokeWidth={3} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </>
    ),
    [theme, t, impactTasks, quickWins, handleCardPress, handleComplete],
  );

  const renderListItem = useCallback(
    ({ item, index }: { item: TaskListItem; index: number }) => {
      if (item.kind === 'group') {
        const group = item.group;
        return (
          <View style={index > 0 ? styles.groupSectionSpacer : null}>
            <View style={[styles.groupHeader, { backgroundColor: theme.surfaceSecondary }]}>
              <View style={[
                styles.groupDot,
                {
                  backgroundColor:
                    group.key === 'overdue'
                      ? theme.error
                      : group.key === 'today'
                      ? theme.primary[500]
                      : group.key === 'tomorrow'
                      ? theme.secondary[500]
                      : theme.accent[500],
                },
              ]} />
              <Text style={[styles.groupTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {t(groupLabels[group.key])}
              </Text>
              <View style={[styles.groupCount, { backgroundColor: theme.surfaceTertiary }]}>
                <Text style={[styles.groupCountText, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {group.tasks.length}
                </Text>
              </View>
            </View>
          </View>
        );
      }
      return (
        <TaskCard
          task={item.task}
          onPress={handleCardPress}
          onComplete={handleComplete}
          onPostpone={handlePostpone}
          onDelete={handleDeleteConfirm}
          onEdit={handleEditPress}
          conflictCount={item.conflictCount}
          selectionMode={selectionMode}
          selected={selectedIdSet.has(item.task.id)}
          onToggleSelect={toggleSelect}
          onTagPress={handleTagPress}
        />
      );
    },
    [
      theme,
      t,
      handleCardPress,
      handleComplete,
      handlePostpone,
      handleDeleteConfirm,
      handleEditPress,
      selectionMode,
      selectedIdSet,
      toggleSelect,
      handleTagPress,
    ],
  );

  const taskListKey = useCallback((item: TaskListItem) => item.key, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState label={t('common.loading')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {selectionMode ? (
              <Pressable
                onPress={exitSelection}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={styles.iconButton}
              >
                <X size={iconSize.xl} color={theme.text.primary} />
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setSelectionMode(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('tasks.bulkComplete')}
                  style={styles.iconButton}
                >
                  <ListChecks size={iconSize.xl} color={theme.primary[500]} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/calendar')}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.title')}
                  style={styles.iconButton}
                >
                  <Calendar size={iconSize.xl} color={theme.primary[500]} />
                </Pressable>
              </>
            )}
          </View>
        }
      />

      <View style={styles.filterContainer}>
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
        />
      </View>

      <View style={styles.viewToggleRow}>
        <Chip selected={view === 'list'} onPress={() => setView('list')}>
          {t('tasks.viewList')}
        </Chip>
        <Chip selected={view === 'matrix'} onPress={() => setView('matrix')}>
          {t('tasks.viewMatrix')}
        </Chip>
      </View>

      {Object.keys(scheduleConflicts).length > 0 ? (
        <Pressable
          onPress={handleFixConflicts}
          style={({ pressed }) => [
            styles.conflictBanner,
            {
              backgroundColor: theme.warningSoft,
              borderColor: theme.warning + '55',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AlertTriangle size={18} color={theme.warning} />
          <View style={styles.conflictBannerText}>
            <Text style={[styles.conflictBannerTitle, { color: theme.warning, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.conflictBanner')}
            </Text>
            <Text style={[styles.conflictBannerHint, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
              {t('tasks.fixConflicts')}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {view === 'list' && hasFilteredResults ? (
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            undoTasks.length > 0 || selectionMode ? styles.scrollContentWithBar : null,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary[500]]}
              tintColor={theme.primary[500]}
            />
          }
          data={listItems}
          renderItem={renderListItem}
          keyExtractor={taskListKey}
          ListHeaderComponent={listHeaderContent}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            undoTasks.length > 0 || selectionMode ? styles.scrollContentWithBar : null,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary[500]]}
              tintColor={theme.primary[500]}
            />
          }
        >
          {listHeaderContent}
          {!hasAnyTasks ? (
            <EmptyState
              icon={<CheckSquare size={iconSize.hero} color={theme.text.tertiary} />}
              title={t('tasks.noTasks')}
              description={t('tasks.noTasksDesc')}
            />
          ) : !hasFilteredResults ? (
            <EmptyState
              icon={<CheckSquare size={iconSize.hero} color={theme.text.tertiary} />}
              title={t('tasks.noResults')}
              description={t('tasks.noResultsDesc')}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setFilters(defaultFilters)}
                >
                  {t('tasks.clearFilters')}
                </Button>
              }
            />
          ) : view === 'matrix' ? (
            <PriorityMatrix
              groups={matrixGroups}
              onOpenTask={handleCardPress}
              onComplete={handleComplete}
            />
          ) : null}
        </ScrollView>
      )}

      {undoTasks.length > 0 && !selectionMode ? (
        <Pressable
          onPress={handleUndo}
          style={[
            styles.undoBar,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow.colorStrong,
            },
          ]}
        >
          <Undo2 size={18} color={theme.primary[500]} />
          <Text style={[styles.undoText, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
            {`${t('tasks.deleted')} ${undoTasks.length}`}
          </Text>
          <Text style={[styles.undoAction, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
            {t('common.undo')}
          </Text>
        </Pressable>
      ) : null}

      {selectionMode ? (
        <View
          style={[
            styles.bulkBar,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow.colorStrong,
            },
          ]}
        >
          <Text style={[styles.bulkCount, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {`${t('tasks.selected')} ${selectedIds.length}`}
          </Text>
          <View style={styles.bulkButtons}>
            <Pressable
              disabled={!selectedIds.length}
              onPress={handleBulkComplete}
              style={[styles.bulkButton, { backgroundColor: theme.success, opacity: selectedIds.length ? 1 : 0.5 }]}
            >
              <CheckSquare size={18} color="#FFFFFF" />
              <Text style={styles.bulkButtonText}>{t('tasks.bulkComplete')}</Text>
            </Pressable>
            <Pressable
              disabled={!selectedIds.length}
              onPress={handleBulkDelete}
              style={[styles.bulkButton, { backgroundColor: theme.error, opacity: selectedIds.length ? 1 : 0.5 }]}
            >
              <X size={18} color="#FFFFFF" />
              <Text style={styles.bulkButtonText}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FAB onPress={() => setShowQuickAdd(true)} />
      )}

      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={(task) => { void handleAddTask(task); }}
        onMoreDetails={handleMoreDetails}
      />

      <TaskFormModal
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTask(null);
          setInitialTask(null);
        }}
        onSave={editingTask ? handleUpdateTask : handleAddTask}
        onDelete={handleDeleteTask}
        editingTask={editingTask}
        initialTask={initialTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: spacing.sm,
  },
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  viewToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  conflictBannerText: { flex: 1, gap: 2 },
  conflictBannerTitle: { fontSize: typography.sizes.sm },
  conflictBannerHint: { fontSize: typography.sizes.xs },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: bottomSpace.fab,
  },
  scrollContentWithBar: {
    // Undo/bulk bars sit above the tab bar and vary in height; keep the last
    // row clear of whichever one is currently visible.
    paddingBottom: bottomSpace.fab + spacing.xl,
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  insightHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  insightHeadingText: { flex: 1, gap: 1 },
  insightTitle: { fontSize: typography.sizes.sm },
  insightHint: { fontSize: typography.sizes.xs },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  insightRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightRowText: { fontSize: typography.sizes.sm, flexShrink: 1, lineHeight: typography.sizes.sm * 1.65 },
  impactBadge: {
    minWidth: 26,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  impactBadgeText: { fontSize: typography.sizes.xs },
  quickTime: { fontSize: typography.sizes.xs },
  quickCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSection: {
    marginBottom: spacing.lg,
  },
  groupSectionSpacer: {
    marginTop: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupTitle: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  groupCount: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    minWidth: 24,
    alignItems: 'center',
  },
  groupCountText: {
    fontSize: typography.sizes.xs,
  },
  undoBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: bottomSpace.tab,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  undoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  undoAction: {
    fontSize: typography.sizes.sm,
  },
  bulkBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 24,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  bulkCount: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  bulkButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilySemiBold,
  },
});
