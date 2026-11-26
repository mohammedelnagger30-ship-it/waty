import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize } from '@/src/theme';
import { Button, ScreenHeader } from '@/src/components';

export default function NotFoundScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const goHome = () => router.replace('/');

  return (
    <>
      <Stack.Screen options={{ title: t('notfound.title') }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title={t('notfound.title')} onBack={goHome} />
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary[500] + '18' }]}>
            <Search size={iconSize.hero} color={theme.primary[500]} />
          </View>
          <View style={[styles.code, { backgroundColor: theme.primary[500] + '1C' }]}>
            <Text style={[styles.codeText, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
              404
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {t('notfound.title')}
          </Text>
          <Text style={[styles.message, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('notfound.msg')}
          </Text>
          <Button onPress={goHome} style={styles.button}>
            {t('notfound.back')}
          </Button>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  code: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  codeText: {
    fontSize: typography.sizes.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
  },
  message: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    minWidth: 180,
  },
});
