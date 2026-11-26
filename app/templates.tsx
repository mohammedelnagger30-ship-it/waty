import { useCallback, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Copy, Layers, Pencil, Sunrise, MoonStar } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize, bottomSpace } from '@/src/theme';
import { Button, Card, EmptyState, FAB, ScreenHeader } from '@/src/components';
import { TemplateFormModal } from '@/src/components/TemplateFormModal';
import { FocusTaskPickerModal } from '@/src/components/FocusTaskPickerModal';
import { taskTemplateRepository, taskRepository } from '@/src/storage';
import { TaskTemplate, Task, TaskPriority } from '@/src/storage/entities';
import { scheduleTaskReminders } from '@/src/notifications';
import { taskFromTemplate, templateFromTask, categoryColors, priorityColors } from '@/src/utils/taskUtils';
import { routineTemplateFor, ROUTINE_IDS, type RoutineId } from '@/src/utils/routines';
import { todayISODate } from '@/src/storage/repository';

export default function TemplatesScreen() {
  const { theme, isDark } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [initialDraft, setInitialDraft] = useState<ReturnType<typeof templateFromTask> | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const load = useCallback(async () => {
    const [allTemplates, allTasks] = await Promise.all([
      taskTemplateRepository.getAll(),
      taskRepository.getAll(),
    ]);
    setTemplates(allTemplates);
    setTasks(allTasks);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openNew = () => {
    setEditing(null);
    setInitialDraft(null);
    setShowForm(true);
  };

  const openEdit = (template: TaskTemplate) => {
    setEditing(template);
    setInitialDraft(null);
    setShowForm(true);
  };

  const handleSave = async (template: TaskTemplate) => {
    if (editing) await taskTemplateRepository.update(template.id, template);
    else await taskTemplateRepository.create(template);
    await load();
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('templates.title'), t('common.delete') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await taskTemplateRepository.delete(id);
          await load();
        },
      },
    ]);
  };

  const handleUse = async (template: TaskTemplate) => {
    const task = taskFromTemplate(template);
    await taskRepository.create(task);
    try { await scheduleTaskReminders(task); } catch { /* best effort */ }
    router.push(`/tasks/${task.id}`);
  };

  const handleFromTask = (task: Task) => {
    setEditing(null);
    setInitialDraft(templateFromTask(task));
    setShowForm(true);
  };

  /** Seeds a built-in routine once, then adds its steps as today's task. */
  const handleRoutine = async (id: RoutineId) => {
    const existing = templates.find(
      (template) => template.tags.includes('routine') && template.tags.includes(id),
    );
    const template = existing ?? routineTemplateFor(id, language);
    if (!existing) await taskTemplateRepository.create(template);

    const task = taskFromTemplate(template, { date: todayISODate() });
    await taskRepository.create(task);
    try { await scheduleTaskReminders(task); } catch { /* best effort */ }
    await load();
    Alert.alert(t('templates.title'), t('routines.added'));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('templates.title')}
        subtitle={t('templates.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button
          variant="secondary"
          icon={<Copy size={18} color={theme.primary[500]} />}
          onPress={() => setShowTaskPicker(true)}
        >
          {t('templates.fromTask')}
        </Button>

        <Card style={styles.routineCard}>
          <Text style={[styles.routineTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('routines.title')}
          </Text>
          <View style={styles.routineButtons}>
            {ROUTINE_IDS.map((id) => (
              <Button
                key={id}
                variant="ghost"
                icon={id === 'morning'
                  ? <Sunrise size={17} color={theme.warning} />
                  : <MoonStar size={17} color={theme.secondary[500]} />}
                onPress={() => void handleRoutine(id)}
              >
                {t(`routines.${id}` as Parameters<typeof t>[0])}
              </Button>
            ))}
          </View>
        </Card>

        {templates.length === 0 ? (
          <EmptyState
            icon={<Layers size={iconSize.hero} color={theme.text.tertiary} />}
            title={t('templates.empty')}
            description={t('templates.emptyDesc')}
          />
        ) : (
          <View style={styles.list}>
            {templates.map((template) => {
              const colors = priorityColors[template.priority as TaskPriority];
              return (
                <Card key={template.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.dot, { backgroundColor: categoryColors[template.category] }]} />
                    <View style={styles.cardText}>
                      <Text style={[styles.cardTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]} numberOfLines={3}>
                        {template.title}
                      </Text>
                      {template.description ? (
                        <Text style={[styles.cardDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]} numberOfLines={2}>
                          {template.description}
                        </Text>
                      ) : null}
                      <Text style={[styles.meta, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                        {t(`tasks.priority.${template.priority}` as Parameters<typeof t>[0])}
                        {' · '}
                        {template.subtaskTitles.length} {t('tasks.field.subtasks')}
                      </Text>
                    </View>
                    <Pressable onPress={() => openEdit(template)} hitSlop={10} style={{ padding: spacing.xs }}>
                      <Pencil size={18} color={isDark ? colors.dark : colors.light} />
                    </Pressable>
                  </View>
                  <View style={styles.cardActions}>
                    <Button variant="ghost" onPress={() => handleDelete(template.id)}>
                      {t('common.delete')}
                    </Button>
                    <Button variant="primary" onPress={() => handleUse(template)}>
                      {t('templates.use')}
                    </Button>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FAB onPress={openNew} />

      <TemplateFormModal
        visible={showForm}
        onClose={() => { setShowForm(false); setEditing(null); setInitialDraft(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        editingTemplate={editing}
        initialTemplate={initialDraft}
      />

      <FocusTaskPickerModal
        visible={showTaskPicker}
        onClose={() => setShowTaskPicker(false)}
        tasks={tasks}
        onSelect={handleFromTask}
        title={t('templates.fromTask')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerText: { flex: 1 },
  headerTitle: { fontSize: typography.sizes.lg },
  headerSubtitle: { fontSize: typography.sizes.xs },
  content: { padding: spacing.lg, paddingBottom: bottomSpace.fab, gap: spacing.md },
  list: { gap: spacing.md },
  card: { gap: spacing.sm, padding: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: typography.sizes.md, lineHeight: typography.sizes.md * 1.65 },
  cardDesc: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.65 },
  meta: { fontSize: typography.sizes.xs, marginTop: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, borderRadius: radius.md },
  routineCard: { gap: spacing.sm },
  routineTitle: { fontSize: typography.sizes.sm },
  routineButtons: { flexDirection: 'row', gap: spacing.sm },
});
