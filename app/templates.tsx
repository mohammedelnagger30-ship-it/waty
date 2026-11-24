import { useCallback, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Copy, Layers, Pencil } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { BackArrow } from '@/src/components/BackArrow';
import { Button, Card, EmptyState, FAB } from '@/src/components';
import { TemplateFormModal } from '@/src/components/TemplateFormModal';
import { FocusTaskPickerModal } from '@/src/components/FocusTaskPickerModal';
import { taskTemplateRepository, taskRepository } from '@/src/storage';
import { TaskTemplate, Task, TaskPriority } from '@/src/storage/entities';
import { scheduleTaskReminders } from '@/src/notifications';
import { taskFromTemplate, templateFromTask, categoryColors, priorityColors } from '@/src/utils/taskUtils';

export default function TemplatesScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: spacing.xs }}>
            <BackArrow size={24} color={theme.text.primary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('templates.title')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('templates.subtitle')}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button
          variant="secondary"
          icon={<Copy size={18} color={theme.primary[500]} />}
          onPress={() => setShowTaskPicker(true)}
        >
          {t('templates.fromTask')}
        </Button>

        {templates.length === 0 ? (
          <EmptyState
            icon={<Layers size={36} color={theme.text.tertiary} />}
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
                      <Text style={[styles.cardTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]} numberOfLines={2}>
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

      <FAB onPress={openNew} bottom={28} icon={<Layers size={26} color="#FFFFFF" />} />

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
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  list: { gap: spacing.md },
  card: { gap: spacing.sm, padding: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: typography.sizes.md },
  cardDesc: { fontSize: typography.sizes.sm },
  meta: { fontSize: typography.sizes.xs, marginTop: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, borderRadius: radius.md },
});
