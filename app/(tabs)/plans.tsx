import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Goal, Habit, Plan, RecurringPlan, Task, GoalStatus } from '@/src/storage/entities';
import {
  goalRepository,
  habitRepository,
  planRepository,
  recurringPlanRepository,
  taskRepository,
} from '@/src/storage';
import { generateId, todayISODate } from '@/src/storage/repository';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, iconSize, bottomSpace } from '@/src/theme';
import {
  ScreenHeader,
  EmptyState,
  FAB,
  Chip,
  GoalCard,
  HabitCard,
  PlanCard,
  GoalFormModal,
  HabitFormModal,
  PlanFormModal,
  RecurringPlanModal,
  RecurringPlanCard,
  GoalDetailModal,
} from '@/src/components';
import { Target, Layers, Flame, RefreshCw } from 'lucide-react-native';
import {
  createBundleFromTemplate,
  syncGoalProgress,
} from '@/src/utils/goalUtils';
import { toggleHabitDate } from '@/src/utils/habitUtils';
import { cancelRecurringPlan, ensureRecurringTasks } from '@/src/utils/recurringUtils';
import { rescheduleAllNotifications, scheduleHabitReminders, scheduleTaskReminders } from '@/src/notifications';

type Section = 'goals' | 'plans' | 'habits' | 'recurring';

export default function PlansScreen() {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [section, setSection] = useState<Section>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [goalModal, setGoalModal] = useState(false);
  const [habitModal, setHabitModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [recurringModal, setRecurringModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const load = useCallback(async () => {
    const [storedGoals, storedPlans, storedHabits, storedRecurring, storedTasks] = await Promise.all([
      goalRepository.getAll(),
      planRepository.getAll(),
      habitRepository.getAll(),
      recurringPlanRepository.getAll(),
      taskRepository.getAll(),
    ]);

    const syncedGoals: Goal[] = [];
    for (const goal of storedGoals) {
      const updated = syncGoalProgress(goal, storedTasks);
      if (updated !== goal) {
        await goalRepository.update(goal.id, {
          progress: updated.progress,
          status: updated.status,
          updatedAt: updated.updatedAt,
        });
      }
      syncedGoals.push(updated);
    }

    setGoals(syncedGoals);
    setPlans(storedPlans);
    setHabits(storedHabits);
    setRecurringPlans(storedRecurring.filter((plan) => plan.active !== false));
    setTasks(storedTasks);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSaveGoal = async (
    goal: Goal,
    templateId?: string,
    createSuggestedTasks = true,
  ) => {
    const isEdit = goals.some((item) => item.id === goal.id);

    if (templateId && !isEdit && createSuggestedTasks) {
      const bundle = createBundleFromTemplate(templateId, language);
      if (bundle) {
        const finalGoal: Goal = {
          ...bundle.goal,
          ...goal,
          id: goal.id,
          milestones: goal.milestones.length > 0 ? goal.milestones : bundle.goal.milestones,
        };
        const plan: Plan = {
          ...bundle.plan,
          id: generateId(),
          goalId: finalGoal.id,
          title: finalGoal.title,
          startDate: todayISODate(),
        };
        const suggestedTasks = bundle.tasks.map((task) => ({
          ...task,
          goalId: finalGoal.id,
          planId: plan.id,
        }));

        await goalRepository.create(finalGoal);
        await planRepository.create(plan);
        for (const task of suggestedTasks) {
          await taskRepository.create(task);
          try {
            await scheduleTaskReminders(task);
          } catch {
            // Notifications are optional on web.
          }
        }
      }
    } else if (isEdit) {
      await goalRepository.update(goal.id, goal);
    } else {
      await goalRepository.create(goal);
    }

    setGoalModal(false);
    setEditingGoal(null);
    await load();
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(t('plans.deleteGoal'), goal.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const linkedTasks = tasks.filter((task) => task.goalId === goal.id);
          await goalRepository.delete(goal.id);
          for (const plan of plans.filter((item) => item.goalId === goal.id)) {
            await planRepository.delete(plan.id);
          }
          for (const task of linkedTasks) {
            await taskRepository.update(task.id, { goalId: undefined, planId: undefined });
          }
          setSelectedGoal(null);
          await load();
        },
      },
    ]);
  };

  const handleToggleGoalStatus = async (goal: Goal) => {
    const next: GoalStatus = goal.status === 'active' ? 'paused' : 'active';
    await goalRepository.update(goal.id, { status: next });
    await load();
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedGoal) return;
    const milestones = selectedGoal.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, done: !milestone.done } : milestone,
    );
    await goalRepository.update(selectedGoal.id, { milestones });
    await load();
    const refreshed = await goalRepository.getById(selectedGoal.id);
    if (refreshed) setSelectedGoal(refreshed);
  };

  const handleSetStatus = async (status: GoalStatus) => {
    if (!selectedGoal) return;
    await goalRepository.update(selectedGoal.id, { status });
    await load();
    const refreshed = await goalRepository.getById(selectedGoal.id);
    if (refreshed) setSelectedGoal(refreshed);
  };

  const handleUpdateProgress = async (value: number) => {
    if (!selectedGoal) return;
    const target = selectedGoal.targetValue ?? 100;
    const progress = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : selectedGoal.progress;
    await goalRepository.update(selectedGoal.id, {
      currentValue: value,
      progress,
      status: progress >= 100 ? 'completed' : selectedGoal.status === 'completed' ? 'active' : selectedGoal.status,
    });
    await load();
    const refreshed = await goalRepository.getById(selectedGoal.id);
    if (refreshed) setSelectedGoal(refreshed);
  };

  const handleSaveHabit = async (habit: Habit) => {
    const exists = habits.some((item) => item.id === habit.id);
    if (exists) await habitRepository.update(habit.id, habit);
    else await habitRepository.create(habit);
    setHabitModal(false);
    setEditingHabit(null);
    await load();
    try {
      await rescheduleAllNotifications();
    } catch {
      // Notifications are optional on web.
    }
  };

  const handleToggleHabit = async (habit: Habit) => {
    const updated = toggleHabitDate(habit, todayISODate());
    await habitRepository.update(habit.id, {
      completedDates: updated.completedDates,
      lastCompletedDate: updated.lastCompletedDate,
      streak: updated.streak,
      bestStreak: updated.bestStreak,
    });
    setHabits((prev) => prev.map((item) => (item.id === habit.id ? updated : item)));
    try {
      await scheduleHabitReminders();
    } catch {
      // Notifications are optional on web.
    }
  };

  const handleDeleteHabit = (habit: Habit) => {
    Alert.alert(t('plans.deleteHabit'), habit.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await habitRepository.delete(habit.id);
          await load();
          try {
            await rescheduleAllNotifications();
          } catch {
            // Notifications are optional on web.
          }
        },
      },
    ]);
  };

  const handleSavePlan = async (plan: Plan) => {
    const exists = plans.some((item) => item.id === plan.id);
    if (exists) await planRepository.update(plan.id, plan);
    else await planRepository.create(plan);
    setPlanModal(false);
    setEditingPlan(null);
    await load();
  };

  const handleDeletePlan = (plan: Plan) => {
    Alert.alert(t('plans.deletePlan'), plan.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await planRepository.delete(plan.id);
          await load();
        },
      },
    ]);
  };

  const handleSaveRecurring = async (incoming: RecurringPlan[]) => {
    for (const plan of incoming) {
      await recurringPlanRepository.create(plan);
    }
    await ensureRecurringTasks();
    try {
      await rescheduleAllNotifications();
    } catch {
      // Notifications are optional on web.
    }
    setRecurringModal(false);
    await load();
  };

  const handleCancelRecurring = (plan: RecurringPlan) => {
    Alert.alert(t('plans.cancelRecurring'), plan.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('plans.cancelRecurring'),
        style: 'destructive',
        onPress: async () => {
          await cancelRecurringPlan(plan.id);
          try {
            await rescheduleAllNotifications();
          } catch {
            // Notifications are optional on web.
          }
          await load();
        },
      },
    ]);
  };

  const openNew = () => {
    if (section === 'goals') {
      setEditingGoal(null);
      setGoalModal(true);
    } else if (section === 'habits') {
      setEditingHabit(null);
      setHabitModal(true);
    } else if (section === 'recurring') {
      setRecurringModal(true);
    } else {
      setEditingPlan(null);
      setPlanModal(true);
    }
  };

  const renderContent = () => {
    if (section === 'goals') {
      if (goals.length === 0) {
        return (
          <EmptyState
            icon={<Target size={iconSize.hero} color={theme.text.tertiary} />}
            title={t('plans.noGoals')}
            description={t('plans.noGoalsDesc')}
          />
        );
      }
      return goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          tasks={tasks}
          onPress={() => setSelectedGoal(goal)}
          onToggleStatus={() => handleToggleGoalStatus(goal)}
          onEdit={() => {
            setEditingGoal(goal);
            setGoalModal(true);
          }}
          onDelete={() => handleDeleteGoal(goal)}
        />
      ));
    }

    if (section === 'habits') {
      if (habits.length === 0) {
        return (
          <EmptyState
            icon={<Flame size={iconSize.hero} color={theme.text.tertiary} />}
            title={t('plans.noHabits')}
            description={t('plans.noHabitsDesc')}
          />
        );
      }
      return habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onToggleToday={() => handleToggleHabit(habit)}
          onEdit={() => {
            setEditingHabit(habit);
            setHabitModal(true);
          }}
          onDelete={() => handleDeleteHabit(habit)}
        />
      ));
    }

    if (section === 'recurring') {
      if (recurringPlans.length === 0) {
        return (
          <EmptyState
            icon={<RefreshCw size={iconSize.hero} color={theme.text.tertiary} />}
            title={t('plans.noRecurring')}
            description={t('plans.noRecurringDesc')}
          />
        );
      }
      return recurringPlans.map((plan) => (
        <RecurringPlanCard
          key={plan.id}
          plan={plan}
          onCancel={() => handleCancelRecurring(plan)}
        />
      ));
    }

    if (plans.length === 0) {
      return (
        <EmptyState
          icon={<Layers size={iconSize.hero} color={theme.text.tertiary} />}
          title={t('plans.noPlansList')}
          description={t('plans.noPlansListDesc')}
        />
      );
    }
    return plans.map((plan) => (
      <PlanCard
        key={plan.id}
        plan={plan}
        goalTitle={goals.find((goal) => goal.id === plan.goalId)?.title}
        onEdit={() => {
          setEditingPlan(plan);
          setPlanModal(true);
        }}
        onDelete={() => handleDeletePlan(plan)}
      />
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('plans.title')} subtitle={t('plans.subtitle')} />

      <View style={styles.segments}>
        <Chip selected={section === 'goals'} onPress={() => setSection('goals')}>
          {t('plans.goalsTab')}
        </Chip>
        <Chip selected={section === 'plans'} onPress={() => setSection('plans')}>
          {t('plans.plansTab')}
        </Chip>
        <Chip selected={section === 'habits'} onPress={() => setSection('habits')}>
          {t('plans.habitsTab')}
        </Chip>
        <Chip selected={section === 'recurring'} onPress={() => setSection('recurring')}>
          {t('plans.recurringTab')}
        </Chip>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderContent()}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <FAB onPress={openNew} />

      <GoalFormModal
        visible={goalModal}
        editingGoal={editingGoal}
        onClose={() => {
          setGoalModal(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
      />
      <HabitFormModal
        visible={habitModal}
        editingHabit={editingHabit}
        onClose={() => {
          setHabitModal(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
      />
      <PlanFormModal
        visible={planModal}
        goals={goals}
        editingPlan={editingPlan}
        onClose={() => {
          setPlanModal(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
      />
      <RecurringPlanModal
        visible={recurringModal}
        onClose={() => setRecurringModal(false)}
        onSave={handleSaveRecurring}
      />
      <GoalDetailModal
        visible={selectedGoal !== null}
        goal={selectedGoal}
        tasks={tasks}
        onClose={() => setSelectedGoal(null)}
        onToggleMilestone={handleToggleMilestone}
        onUpdateProgress={handleUpdateProgress}
        onSetStatus={handleSetStatus}
        onDelete={() => {
          if (selectedGoal) handleDeleteGoal(selectedGoal);
        }}
        onOpenTask={(task) => {
          setSelectedGoal(null);
          router.push(`/tasks/${task.id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
  },
  bottomSpace: {
    height: bottomSpace.fab,
  },
});
