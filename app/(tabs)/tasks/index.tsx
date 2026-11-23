import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, Alert, Pressable } from 'react-native';
import { CheckSquare, Plus, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { EmptyState } from '@/src/components/EmptyState';
import { FAB } from '@/src/components/FAB';
import { TaskCard } from '@/src/components/TaskCard';
import { FilterBar } from '@/src/components/FilterBar';
import { QuickAddModal } from '@/src/components/QuickAddModal';
import { TaskFormModal } from '@/src/components/TaskFormModal';
import { taskRepository } from '@/src/storage';
import { Task, TaskStatus } from '@/src/storage/entities';
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

export default function TasksScreen() {
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

  const loadTasks = useCallback(async () => {
    const all = await taskRepository.getAll();
    setTasks(all);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleAddTask = async (task: Task) => {
    await taskRepository.create(task);
    await scheduleTaskReminders(task);
    await loadTasks();
  };

  const handleUpdateTask = async (task: Task) => {
    await taskRepository.update(task.id, task);
    await rescheduleTaskReminders(task);
    await loadTasks();
  };

  const handleDeleteTask = async (id: string) => {
    await cancelTaskReminders(id);
    await taskRepository.delete(id);
    await loadTasks();
  };

  const handleComplete = async (task: Task) => {
    const { nextOccurrence, completed } = completeRepeatingTask(task);
    if (nextOccurrence) {
      await taskRepository.create(nextOccurrence);
      await scheduleTaskReminders(nextOccurrence);
    }
    await taskRepository.update(task.id, completed);
    await cancelTaskReminders(task.id);
    await loadTasks();
  };

  const handlePostpone = async (task: Task) => {
    const next = addDays(task.date, 1);
    const updated = await taskRepository.update(task.id, {
      status: 'postponed' as TaskStatus,
      date: next,
      originalDate: task.date,
    });
    if (updated) await rescheduleTaskReminders(updated);
    await loadTasks();
  };

  const handleDeleteConfirm = (task: Task) => {
    Alert.alert(t('tasks.confirmDelete'), t('tasks.confirmDeleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => handleDeleteTask(task.id),
      },
    ]);
  };

  const handleCardPress = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };

  const handleEditPress = (task: Task) => {
    setInitialTask(null);
    setEditingTask(task);
    setShowForm(true);
  };

  const handleMoreDetails = (title: string, time: string) => {
    setShowQuickAdd(false);
    setEditingTask(null);
    setInitialTask(createDefaultTask({ title, time: time || undefined }));
    setShowForm(true);
  };

  const filteredTasks = useMemo(() => {
    const filtered = filterTasks(tasks, filters);
    const sorted = sortTasks(filtered, sort);
    return sorted;
  }, [tasks, filters, sort]);

  const grouped = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks]);

  const hasAnyTasks = tasks.length > 0;
  const hasFilteredResults = grouped.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        right={
          <Pressable onPress={() => router.push('/calendar')} style={{ padding: 8 }}>
            <Calendar size={22} color={theme.primary[500]} />
          </Pressable>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {!hasAnyTasks ? (
          <EmptyState
            icon={<CheckSquare size={36} color={theme.text.tertiary} />}
            title={t('tasks.noTasks')}
            description={t('tasks.noTasksDesc')}
          />
        ) : !hasFilteredResults ? (
          <EmptyState
            icon={<CheckSquare size={36} color={theme.text.tertiary} />}
            title={t('tasks.noTasks')}
            description={t('tasks.noTasksDesc')}
          />
        ) : (
          grouped.map((group) => (
            <View key={group.key} style={styles.groupSection}>
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

              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={handleCardPress}
                  onComplete={handleComplete}
                  onPostpone={handlePostpone}
                  onDelete={handleDeleteConfirm}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <FAB onPress={() => setShowQuickAdd(true)} bottom={90} icon={<Plus size={28} color="#FFFFFF" strokeWidth={2.5} />} />

      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleAddTask}
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
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  groupSection: {
    marginBottom: spacing.lg,
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
});
