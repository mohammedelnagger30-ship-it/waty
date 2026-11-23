import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DownloadCloud } from 'lucide-react-native';
import { Button } from './Button';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { getCurrentVersion, openDownload, type UpdateInfo } from '@/src/updates/updateService';

interface UpdateDialogProps {
  info: UpdateInfo | null;
  onDismiss: () => void;
}

export function UpdateDialog({ info, onDismiss }: UpdateDialogProps) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useI18n();
  if (!info) return null;

  const notes = language === 'ar' ? info.notes || info.notesEn : info.notesEn || info.notes;

  const handleDownload = () => {
    onDismiss();
    void openDownload(info);
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
            },
          ]}
          onPress={() => {}}
          accessibilityRole="alert"
        >
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
            <ScrollView style={styles.notesWrap} showsVerticalScrollIndicator={false}>
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

          <View style={styles.actions}>
            <Button variant="ghost" onPress={onDismiss} style={styles.laterButton}>
              {t('update.later')}
            </Button>
            <Button variant="primary" onPress={handleDownload} icon={<DownloadCloud size={17} color="#FFFFFF" />}>
              {t('update.download')}
            </Button>
          </View>
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
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
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
