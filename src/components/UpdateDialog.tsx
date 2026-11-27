import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DownloadCloud } from 'lucide-react-native';
import { Button } from './Button';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography, useResponsive } from '@/src/theme';
import {
  cancelDownload,
  downloadUpdate,
  getCurrentVersion,
  installUpdate,
  openDownload,
  verifyDownload,
  type DownloadProgress,
  type UpdateInfo,
} from '@/src/updates/updateService';

interface UpdateDialogProps {
  info: UpdateInfo | null;
  onDismiss: () => void;
}

type Phase = 'idle' | 'downloading' | 'installing' | 'failed';

export function UpdateDialog({ info, onDismiss }: UpdateDialogProps) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useI18n();
  const responsive = useResponsive();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({ written: 0, total: 0, percent: 0 });
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (info) {
      setPhase('idle');
      setProgress({ written: 0, total: 0, percent: 0 });
      cancelledRef.current = false;
    }
  }, [info]);

  if (!info) return null;

  const notes = language === 'ar' ? info.notes || info.notesEn : info.notesEn || info.notes;

  const handleDownload = async () => {
    cancelledRef.current = false;
    setPhase('downloading');
    setProgress({ written: 0, total: 0, percent: 0 });
    try {
      const uri = await downloadUpdate(info, setProgress);
      if (!(await verifyDownload(uri, info.sha256))) {
        throw new Error('Update checksum mismatch');
      }
      setPhase('installing');
      const opened = await installUpdate(uri);
      if (!opened) {
        await openDownload(info);
      }
      onDismiss();
    } catch {
      if (!cancelledRef.current) setPhase('failed');
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel={t('update.later')}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.isDark ? '#000000' : theme.primary[900],
              maxHeight: responsive.isShortLandscape ? '88%' : '82%',
            },
          ]}
          onPress={() => {}}
          accessibilityRole="alert"
        >
          <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary[500] + '18' }]}>
            <DownloadCloud size={26} color={theme.primary[500]} strokeWidth={2.2} />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: theme.text.primary,
                fontFamily: typography.fontFamilyBold,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {t('update.available')}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: theme.text.secondary,
                fontFamily: typography.fontFamily,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {`${t('update.current')}: ${getCurrentVersion()}    •    ${t('update.latest')}: ${info.version}`}
          </Text>

          {notes ? (
            <ScrollView
              style={[styles.notesWrap, responsive.isShortLandscape ? { maxHeight: 90 } : null]}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={[
                  styles.notes,
                  {
                    color: theme.text.secondary,
                    fontFamily: typography.fontFamily,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
              >
                {notes}
              </Text>
            </ScrollView>
          ) : null}

          {phase === 'downloading' ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                  {t('update.downloading')}
                </Text>
                <Text style={[styles.progressText, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
                  {`${progress.percent}%`}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.border, direction: isRTL ? 'rtl' : 'ltr' }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.primary[500], width: `${progress.percent}%` }]} />
              </View>
            </View>
          ) : null}

          {phase === 'installing' ? (
            <View style={styles.installingRow}>
              <ActivityIndicator size="small" color={theme.primary[500]} />
              <Text style={[styles.progressText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {t('update.installing')}
              </Text>
            </View>
          ) : null}

          {phase === 'failed' ? (
            <Text style={[styles.errorText, { color: theme.error, fontFamily: typography.fontFamily }]}>
              {t('update.downloadFailed')}
            </Text>
          ) : (
            <Text
              style={[
                styles.hintText,
                {
                  color: theme.text.tertiary,
                  fontFamily: typography.fontFamily,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              {t('update.installHint')}
            </Text>
          )}

          <View style={styles.actions}>
            {phase === 'downloading' ? (
              <Button
                variant="ghost"
                onPress={() => {
                  cancelledRef.current = true;
                  cancelDownload();
                  setPhase('idle');
                }}
              >
                {t('update.later')}
              </Button>
            ) : phase === 'failed' ? (
              <>
                <Button variant="ghost" onPress={onDismiss}>{t('update.later')}</Button>
                <Button variant="outline" onPress={() => { void openDownload(info); }}>
                  {t('update.openBrowser')}
                </Button>
                <Button variant="primary" onPress={() => { void handleDownload(); }}>
                  {t('update.retry')}
                </Button>
              </>
            ) : phase === 'installing' ? null : (
              <>
                <Button variant="ghost" onPress={onDismiss} style={styles.laterButton}>
                  {t('update.later')}
                </Button>
                <Button
                  variant="primary"
                  onPress={() => { void handleDownload(); }}
                  icon={<DownloadCloud size={17} color="#FFFFFF" />}
                >
                  {t('update.download')}
                </Button>
              </>
            )}
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface UpdateNoticeProps {
  text: string | null;
  onDismiss: () => void;
}

export function UpdateNotice({ text, onDismiss }: UpdateNoticeProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  if (!text) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.noticeCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          onPress={() => {}}
          accessibilityRole="alert"
        >
          <Text
            style={[
              styles.noticeText,
              { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold },
            ]}
          >
            {text}
          </Text>
          <Button variant="outline" size="sm" onPress={onDismiss}>
            {t('update.ok')}
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 12, 24, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '82%',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.lg,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
  },
  notesWrap: {
    maxHeight: 170,
    marginTop: spacing.xs,
  },
  notes: {
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  progressWrap: {
    gap: 6,
    marginTop: spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: typography.sizes.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  installingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  hintText: {
    fontSize: typography.sizes.xs,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  laterButton: {
    minWidth: 88,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  noticeText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
});
