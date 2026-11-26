import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { Search, SlidersHorizontal, ArrowDownUp, X } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Chip } from './Chip';
import { Button } from './Button';
import { TaskPriority, TaskStatus, TaskCategory, SavedFilter } from '@/src/storage/entities';
import { settingsRepository, generateId } from '@/src/storage';
import {
  allCategories,
  allPriorities,
  allStatuses,
  SortOption,
  FilterOptions,
} from '@/src/utils/taskUtils';

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const defaultFilters: FilterOptions = {
  search: '',
  category: 'all',
  priority: 'all',
  status: 'all',
};

export function FilterBar({ filters, onFiltersChange, sort, onSortChange }: FilterBarProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    void settingsRepository.getOrCreate().then((settings) => {
      setSavedFilters(settings.savedFilters ?? []);
    });
  }, []);

  const hasActiveFilters =
    filters.category !== 'all' || filters.priority !== 'all' || filters.status !== 'all';

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'date', label: t('tasks.sort.date') },
    { key: 'priority', label: t('tasks.sort.priority') },
    { key: 'title', label: t('tasks.sort.title') },
    { key: 'status', label: t('tasks.sort.status') },
  ];

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setShowFilter(false);
  };

  const clearFilters = () => {
    onFiltersChange(defaultFilters);
    setShowFilter(false);
  };

  const persistSavedFilters = async (next: SavedFilter[]) => {
    setSavedFilters(next);
    await settingsRepository.patch({ savedFilters: next });
  };

  const handleSaveFilter = async () => {
    const name = filterName.trim() || t('filters.untitled');
    const preset: SavedFilter = {
      id: generateId(),
      name,
      search: localFilters.search,
      category: localFilters.category,
      priority: localFilters.priority,
      status: localFilters.status,
      sort,
    };
    await persistSavedFilters([...savedFilters.filter((item) => item.name !== name), preset]);
    setFilterName('');
  };

  const applySavedFilter = (preset: SavedFilter) => {
    onFiltersChange({
      search: preset.search,
      category: preset.category,
      priority: preset.priority,
      status: preset.status,
    });
    onSortChange(preset.sort);
    setShowFilter(false);
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
        <Search size={18} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
        <TextInput
          value={filters.search}
          onChangeText={(v) => onFiltersChange({ ...filters, search: v })}
          placeholder={t('tasks.search')}
          placeholderTextColor={theme.text.tertiary}
          style={[styles.searchInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
        />
        {filters.search ? (
          <Pressable onPress={() => onFiltersChange({ ...filters, search: '' })} hitSlop={8}>
            <X size={16} color={theme.text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => setShowFilter(true)}
          style={[
            styles.actionBtn,
            {
              backgroundColor: hasActiveFilters ? theme.primary[500] + '22' : theme.surfaceSecondary,
              borderColor: hasActiveFilters ? theme.primary[500] : theme.border,
            },
          ]}
        >
          <SlidersHorizontal size={16} color={hasActiveFilters ? theme.primary[isDarkActive(theme)] : theme.text.secondary} />
          <Text style={[styles.actionText, { color: hasActiveFilters ? theme.primary[isDarkActive(theme)] : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('tasks.filter')}
          </Text>
          {hasActiveFilters && <View style={styles.filterDot} />}
        </Pressable>

        <Pressable
          onPress={() => setShowSort(true)}
          style={[styles.actionBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        >
          <ArrowDownUp size={16} color={theme.text.secondary} />
          <Text style={[styles.actionText, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {sortOptions.find((s) => s.key === sort)?.label}
          </Text>
        </Pressable>
      </View>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeChips}>
          {filters.category !== 'all' && (
            <Chip
              selected
              onPress={() => onFiltersChange({ ...filters, category: 'all' as TaskCategory | 'all' })}
            >
              {t(`tasks.category.${filters.category}` as Parameters<typeof t>[0])} ✕
            </Chip>
          )}
          {filters.priority !== 'all' && (
            <Chip
              selected
              onPress={() => onFiltersChange({ ...filters, priority: 'all' as TaskPriority | 'all' })}
            >
              {t(`tasks.priority.${filters.priority}` as Parameters<typeof t>[0])} ✕
            </Chip>
          )}
          {filters.status !== 'all' && (
            <Chip
              selected
              onPress={() => onFiltersChange({ ...filters, status: 'all' as TaskStatus | 'all' })}
            >
              {t(`tasks.status.${filters.status}` as Parameters<typeof t>[0])} ✕
            </Chip>
          )}
        </ScrollView>
      )}

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowSort(false)}>
          <View style={[styles.sortSheet, { backgroundColor: theme.surface, borderRadius: radius.lg }]}>
            {sortOptions.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onSortChange(opt.key);
                  setShowSort(false);
                }}
                style={[
                  styles.sortItem,
                  sort === opt.key && { backgroundColor: theme.primary[500] + '15' },
                ]}
              >
                <Text
                  style={[
                    styles.sortLabel,
                    {
                      color: sort === opt.key ? theme.primary[500] : theme.text.primary,
                      fontFamily: sort === opt.key ? typography.fontFamilySemiBold : typography.fontFamily,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {sort === opt.key && <View style={styles.sortDot} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowFilter(false)}>
          <Pressable
            style={[styles.filterSheet, { backgroundColor: theme.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.filterHandle} />
            <Text style={[styles.filterTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('tasks.filter')}
            </Text>

            <ScrollView style={styles.filterScroll} keyboardShouldPersistTaps="handled">
            {/* Category */}
            <Text style={[styles.filterLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.category')}
            </Text>
            <View style={styles.filterChips}>
              <Chip
                selected={localFilters.category === 'all'}
                onPress={() => setLocalFilters({ ...localFilters, category: 'all' })}
              >
                {t('common.all')}
              </Chip>
              {allCategories.map((c) => (
                <Chip
                  key={c}
                  selected={localFilters.category === c}
                  onPress={() => setLocalFilters({ ...localFilters, category: c })}
                >
                  {t(`tasks.category.${c}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </View>

            {/* Priority */}
            <Text style={[styles.filterLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
              {t('tasks.field.priority')}
            </Text>
            <View style={styles.filterChips}>
              <Chip
                selected={localFilters.priority === 'all'}
                onPress={() => setLocalFilters({ ...localFilters, priority: 'all' })}
              >
                {t('common.all')}
              </Chip>
              {allPriorities.map((p) => (
                <Chip
                  key={p}
                  selected={localFilters.priority === p}
                  onPress={() => setLocalFilters({ ...localFilters, priority: p })}
                >
                  {t(`tasks.priority.${p}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </View>

            {/* Status */}
            <Text style={[styles.filterLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
              {t('tasks.status.pending')}
            </Text>
            <View style={styles.filterChips}>
              <Chip
                selected={localFilters.status === 'all'}
                onPress={() => setLocalFilters({ ...localFilters, status: 'all' })}
              >
                {t('common.all')}
              </Chip>
              {allStatuses.map((s) => (
                <Chip
                  key={s}
                  selected={localFilters.status === s}
                  onPress={() => setLocalFilters({ ...localFilters, status: s })}
                >
                  {t(`tasks.status.${s}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </View>

            {/* Saved filter presets */}
            <Text style={[styles.filterLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.lg }]}>
              {t('filters.saved')}
            </Text>
            <View style={styles.saveRow}>
              <TextInput
                value={filterName}
                onChangeText={setFilterName}
                placeholder={t('filters.namePlaceholder')}
                placeholderTextColor={theme.text.tertiary}
                style={[styles.saveInput, { color: theme.text.primary, borderColor: theme.border, fontFamily: typography.fontFamily }]}
              />
              <Button variant="secondary" onPress={() => void handleSaveFilter()}>
                {t('filters.save')}
              </Button>
            </View>
            {savedFilters.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedRow}>
                {savedFilters.map((preset) => (
                  <View key={preset.id} style={[styles.savedChip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Pressable onPress={() => applySavedFilter(preset)} hitSlop={6}>
                      <Text style={[styles.savedChipText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                        {preset.name}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void persistSavedFilters(savedFilters.filter((item) => item.id !== preset.id))}
                      hitSlop={8}
                    >
                      <X size={13} color={theme.text.tertiary} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Actions */}
            <View style={styles.filterActions}>
              <Button variant="ghost" onPress={clearFilters}>
                {t('common.none')}
              </Button>
              <Button variant="primary" onPress={applyFilters}>
                {t('common.confirm')}
              </Button>
            </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function isDarkActive(theme: { isDark: boolean }): 400 | 600 {
  return theme.isDark ? 400 : 600;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  actionText: {
    fontSize: typography.sizes.sm,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A9FE8',
  },
  activeChips: {
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    margin: spacing.lg,
    padding: spacing.md,
    alignSelf: 'center',
    minWidth: 200,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md * 0.75,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  sortLabel: {
    fontSize: typography.sizes.md,
  },
  sortDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A9FE8',
  },
  filterSheet: {
    maxHeight: '80%',
    overflow: 'hidden',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  filterTitle: {
    fontSize: typography.sizes.xl,
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.sm,
  },
  savedRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginEnd: spacing.xs,
  },
  savedChipText: {
    fontSize: typography.sizes.xs,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
