import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import {
  Sun,
  Moon,
  Globe,
  Info,
  Bell,
  ChevronRight,
  ChevronLeft,
  Repeat,
  Calendar,
  Search,
  Database,
  ClipboardCheck,
  Smartphone,
  Palette,
  Check,
  Type,
  DownloadCloud,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { useFontScale } from '@/src/context/FontScaleProvider';
import { useI18n, Language } from '@/src/i18n';
import { palettes, spacing, typography, radius, type PaletteDefinition } from '@/src/theme';
import type { PaletteId } from '@/src/storage/entities';
import { haptics } from '@/src/utils/haptics';
import { usePressAnimation } from '@/src/hooks/usePressAnimation';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Card, Chip, Toggle } from '@/src/components';
import { settingsRepository } from '@/src/storage';
import { Settings } from '@/src/storage/entities';
import { useAppUpdate, getCurrentVersion } from '@/src/updates';

interface NavRowProps {
  icon: ReactNode;
  title: string;
  description?: string;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PaletteOptionProps {
  palette: PaletteDefinition;
  selected: boolean;
  onSelect: (id: PaletteId) => void;
}

/** A palette swatch whose selected state matches the palette it previews. */
function PaletteOption({ palette, selected, onSelect }: PaletteOptionProps) {
  const { theme, isDark } = useTheme();
  const { language } = useI18n();
  const { onPressIn, onPressOut, style: pressStyle } = usePressAnimation({
    scaleTo: 0.96,
    opacityTo: 0.9,
  });
  const accent = palette.primary;

  return (
    <AnimatedPressable
      onPress={() => onSelect(palette.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.paletteCard,
        {
          backgroundColor: selected ? accent + (isDark ? '2E' : '16') : theme.surfaceSecondary,
          borderColor: selected ? accent : theme.border,
          borderWidth: selected ? 2 : 1.5,
          shadowColor: accent,
          shadowOpacity: selected ? 0.28 : 0,
          shadowRadius: selected ? 11 : 0,
          elevation: selected && !isDark ? 4 : 0,
        },
        pressStyle,
      ]}
    >
      <View style={styles.paletteSwatches}>
        <View style={[styles.paletteDot, { backgroundColor: palette.primary }]} />
        <View style={[styles.paletteDot, { backgroundColor: palette.secondary }]} />
        <View style={[styles.paletteDot, { backgroundColor: palette.accent }]} />
      </View>
      <Text
        style={[
          styles.paletteName,
          {
            color: selected ? accent : theme.text.secondary,
            fontFamily: typography.fontFamilySemiBold,
          },
        ]}
      >
        {language === 'ar' ? palette.name.ar : palette.name.en}
      </Text>
      {selected && (
        <View style={[styles.paletteCheck, { backgroundColor: accent }]}>
          <Check size={12} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
    </AnimatedPressable>
  );
}

function NavRow({ icon, title, description, onPress }: NavRowProps) {
  const { theme } = useTheme();
  const { isRTL } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        {
          opacity: pressed ? 0.85 : 1,
          backgroundColor: pressed ? theme.primary[500] + '12' : 'transparent',
        },
      ]}
    >
      <View style={[styles.navIcon, { backgroundColor: theme.primary[500] + '18' }]}>{icon}</View>
      <View style={styles.navText}>
        <Text style={[styles.navTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.navDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {isRTL
        ? <ChevronLeft size={20} color={theme.text.tertiary} />
        : <ChevronRight size={20} color={theme.text.tertiary} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme, mode, isDark, setMode, paletteId, setPalette } = useTheme();
  const {
    simpleModeEnabled,
    setSimpleModeEnabled,
    systemFontScale,
    isSystemScaleDetected,
    fontScaleMultiplier,
    setFontScaleMultiplier,
  } = useFontScale();
  const { t, language, setLanguage } = useI18n();
  const { check, checking } = useAppUpdate();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadSettings = useCallback(async () => {
    const s = await settingsRepository.getOrCreate();
    setSettings(s);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (updates: Partial<Settings>) => {
    if (!settings) return;
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await settingsRepository.patch(updates);
  };

  const handlePaletteSelect = (id: PaletteId) => {
    haptics.selection();
    setPalette(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={theme.primary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('settings.language')}
            </Text>
          </View>
          <View style={styles.chipRow}>
            <Chip selected={language === 'ar'} onPress={() => setLanguage('ar' as Language)}>
              العربية
            </Chip>
            <Chip selected={language === 'en'} onPress={() => setLanguage('en' as Language)}>
              English
            </Chip>
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sun size={20} color={theme.secondary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('settings.theme')}
            </Text>
          </View>
          <View style={styles.chipRow}>
            <Chip selected={mode === 'light'} onPress={() => setMode('light')}>
              <View style={styles.chipContent}>
                <Sun size={16} color={mode === 'light' ? '#FFFFFF' : theme.text.secondary} />
                <Text style={[styles.chipText, { color: mode === 'light' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('settings.lightMode')}
                </Text>
              </View>
            </Chip>
            <Chip selected={mode === 'dark'} onPress={() => setMode('dark')}>
              <View style={styles.chipContent}>
                <Moon size={16} color={mode === 'dark' ? '#FFFFFF' : theme.text.secondary} />
                <Text style={[styles.chipText, { color: mode === 'dark' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('settings.darkMode')}
                </Text>
              </View>
            </Chip>
            <Chip selected={mode === 'system'} onPress={() => setMode('system')}>
              <View style={styles.chipContent}>
                <Smartphone size={16} color={mode === 'system' ? '#FFFFFF' : theme.text.secondary} />
                <Text style={[styles.chipText, { color: mode === 'system' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('settings.system')}
                </Text>
              </View>
            </Chip>
          </View>
          {mode === 'system' ? (
            <Text style={[styles.themeHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {isDark ? t('settings.darkMode') : t('settings.lightMode')}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={theme.primary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('settings.colors')}
            </Text>
          </View>
          <Text style={[styles.paletteDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('settings.colorsDesc')}
          </Text>
          <View style={styles.paletteGrid}>
            {palettes.map((palette) => (
              <PaletteOption
                key={palette.id}
                palette={palette}
                selected={paletteId === palette.id}
                onSelect={handlePaletteSelect}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <NavRow
            icon={<Bell size={20} color={theme.primary[500]} />}
            title={t('notifications.title')}
            onPress={() => router.push('/notifications')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <NavRow
            icon={<Search size={20} color={theme.secondary[500]} />}
            title={t('settings.search')}
            description={t('settings.searchDesc')}
            onPress={() => router.push('/search')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <NavRow
            icon={<ClipboardCheck size={20} color={theme.accent[500]} />}
            title={t('settings.weeklyReview')}
            description={t('settings.weeklyReviewDesc')}
            onPress={() => router.push('/weekly-review')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <NavRow
            icon={<DownloadCloud size={20} color={theme.info} />}
            title={t('update.check')}
            description={checking ? t('update.checking') : t('update.checkDesc')}
            onPress={() => {
              void check(true);
            }}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <NavRow
            icon={<Database size={20} color={theme.warning} />}
            title={t('settings.dataExport')}
            description={t('settings.dataExportDesc')}
            onPress={() => router.push('/data')}
          />
        </Card>

        {settings && (
          <Card style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleRowLeft}>
                <Repeat size={20} color={theme.accent[500]} />
                <View style={styles.toggleRowText}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                    {t('settings.autoRollover')}
                  </Text>
                  <Text style={[styles.toggleDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    {t('settings.autoRolloverDesc')}
                  </Text>
                </View>
              </View>
              <Toggle
                value={settings.autoRolloverEnabled}
                onValueChange={(v) => updateSettings({ autoRolloverEnabled: v })}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleRowLeft}>
                <Calendar size={20} color={theme.secondary[500]} />
                <View style={styles.toggleRowText}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                    {t('settings.hijriDate')}
                  </Text>
                  <Text style={[styles.toggleDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    {t('settings.hijriDateDesc')}
                  </Text>
                </View>
              </View>
              <Toggle
                value={settings.showHijriDate}
                onValueChange={(v) => updateSettings({ showHijriDate: v })}
              />
            </View>
          </Card>
        )}

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={20} color={theme.primary[500]} />
            <View style={{ flex: 1, marginStart: spacing.xs }}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('settings.fontScaleTitle')}
              </Text>
              <Text style={[styles.paletteDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('settings.fontScaleSubtitle')}
              </Text>
            </View>
          </View>

          {isSystemScaleDetected && (
            <View style={[styles.detectionBanner, { backgroundColor: theme.primary[500] + '14', borderColor: theme.primary[500] + '35' }]}>
              <Smartphone size={18} color={theme.primary[500]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detectionTitle, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
                  {t('settings.fontScaleDetected')} ({systemFontScale.toFixed(1)}x)
                </Text>
                <Text style={[styles.detectionDesc, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                  {t('settings.fontScaleDetectedDesc').replace('{scale}', systemFontScale.toFixed(1))}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.toggleRow}>
            <View style={styles.toggleRowLeft}>
              <View style={styles.toggleRowText}>
                <Text style={[styles.rowTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('settings.simpleMode')}
                </Text>
                <Text style={[styles.toggleDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('settings.simpleModeDesc')}
                </Text>
              </View>
            </View>
            <Toggle
              value={simpleModeEnabled}
              onValueChange={(v) => {
                haptics.selection();
                setSimpleModeEnabled(v);
                updateSettings({ simpleModeEnabled: v });
              }}
            />
          </View>

          {!simpleModeEnabled && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[styles.subLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('settings.fontScaleSize')}
              </Text>
              <View style={styles.chipRow}>
                <Chip
                  selected={fontScaleMultiplier === 0.9}
                  onPress={() => {
                    haptics.selection();
                    setFontScaleMultiplier(0.9);
                  }}
                >
                  {t('settings.fontScaleCompact')}
                </Chip>
                <Chip
                  selected={fontScaleMultiplier === 1.0}
                  onPress={() => {
                    haptics.selection();
                    setFontScaleMultiplier(1.0);
                  }}
                >
                  {t('settings.fontScaleDefault')}
                </Chip>
                <Chip
                  selected={fontScaleMultiplier === 1.15}
                  onPress={() => {
                    haptics.selection();
                    setFontScaleMultiplier(1.15);
                  }}
                >
                  {t('settings.fontScaleComfortable')}
                </Chip>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={theme.accent[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('settings.about')}
            </Text>
          </View>
          <Text style={[styles.aboutText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('settings.aboutDesc')}
          </Text>
          <Text style={[styles.versionText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('settings.version')}: {getCurrentVersion()}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    flex: 1,
    gap: 2,
  },
  navTitle: {
    fontSize: typography.sizes.md,
  },
  navDesc: {
    fontSize: typography.sizes.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: typography.sizes.sm,
  },
  themeHint: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  paletteDesc: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.md,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paletteCard: {
    width: '30%',
    minHeight: 78,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  paletteSwatches: {
    flexDirection: 'row',
    gap: 5,
  },
  paletteDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  paletteName: {
    fontSize: typography.sizes.sm,
  },
  paletteCheck: {
    position: 'absolute',
    top: spacing.xs,
    end: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  toggleRowText: {
    flex: 1,
    gap: 2,
  },
  toggleDesc: {
    fontSize: typography.sizes.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  detectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  detectionTitle: {
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  detectionDesc: {
    fontSize: typography.sizes.xs - 1,
    lineHeight: 16,
  },
  rowTitle: {
    fontSize: typography.sizes.md,
  },
  subLabel: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  aboutText: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  versionText: {
    fontSize: typography.sizes.sm,
  },
});
